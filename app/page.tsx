'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, initializeFirebase } from '@/lib/firebase/config';
import Header from '@/components/Header';
import GachaConfigModal from '@/components/GachaConfigModal';
import GachaResultModal from '@/components/GachaResultModal';
import Modal from '@/components/Modal';
import Link from 'next/link';
import { GachaConfig, GachaResult, LoginBonusConfig, GachaItem } from '@/types/gacha';
import { executeGacha, validateProbabilities } from '@/lib/gacha';
import {
  getGachaConfigFromStorage,
  getLoginBonusConfigFromStorage,
  getTodayGachaCountFromStorage,
  updateTodayGachaCountInStorage,
  saveGachaResultToStorage,
} from '@/lib/storage';
import {
  getUserGachaData,
  saveGachaResult,
  updateTodayGachaCount,
  updateConsecutiveLoginDays,
  saveSharedConfig,
  getSharedConfig,
} from '@/lib/firebase/gacha';

// デフォルトのガチャ設定
const getDefaultGachaConfig = (): GachaConfig => ({
  title: 'ダイエットガチャ',
  items: [
    { id: '1', name: '鶏むね肉とブロッコリー', probability: 75 },
    { id: '2', name: 'サーモン', probability: 15 },
    { id: '3', name: '赤身肉', probability: 5 },
    { id: '4', name: 'ラーメン二郎', probability: 5 },
  ],
  dailyLimit: 10,
});

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [gachaConfig, setGachaConfig] = useState<GachaConfig | null>(getDefaultGachaConfig());
  const [loginBonusConfig, setLoginBonusConfig] = useState<LoginBonusConfig | null>(null);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [todayGachaCount, setTodayGachaCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [consecutiveLoginDays, setConsecutiveLoginDays] = useState<number>(0);
  const [loginDaysIncreased, setLoginDaysIncreased] = useState<number | null>(null);

  // URLクエリパラメータからガチャ設定を読み込む
  const loadConfigFromUrl = useCallback(async (): Promise<{ config: GachaConfig | null; bonusConfig: LoginBonusConfig | null }> => {
    // 短縮URL（shareパラメータ）を優先
    const shareId = searchParams.get('share');
    if (shareId) {
      try {
        const { auth: authInstance } = initializeFirebase();
        if (authInstance) {
          const sharedData = await getSharedConfig(shareId);
          return sharedData;
        }
      } catch (error) {
        console.error('Failed to load shared config:', error);
      }
    }
    
    // 従来のconfigパラメータ（後方互換性のため残す）
    const configParam = searchParams.get('config');
    if (!configParam) return { config: null, bonusConfig: null };

    try {
      const decoded = decodeURIComponent(configParam);
      const data = JSON.parse(decoded);
      
      // バリデーション
      if (data.title && data.items && Array.isArray(data.items) && data.dailyLimit) {
        // IDを再生成
        const itemsWithIds = data.items.map((item: any, index: number) => ({
          id: (index + 1).toString(),
          name: item.name || '',
          probability: item.probability || 0,
        }));
        
        const config: GachaConfig = {
          title: data.title,
          items: itemsWithIds,
          dailyLimit: data.dailyLimit,
        };
        
        // ボーナス設定がある場合は読み込む
        let bonusConfig: LoginBonusConfig | null = null;
        if (data.bonusConfig) {
          const bonusItemsWithIds = data.bonusConfig.bonusItems.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            name: item.name || '',
            probability: item.probability || 0,
          }));
          
          bonusConfig = {
            requiredDays: data.bonusConfig.requiredDays,
            bonusGachaName: data.bonusConfig.bonusGachaName,
            bonusItems: bonusItemsWithIds,
            bonusDailyLimit: data.bonusConfig.bonusDailyLimit,
          };
        }
        
        return { config, bonusConfig };
      }
    } catch (error) {
      console.error('Failed to parse config from URL:', error);
    }
    
    return { config: null, bonusConfig: null };
  }, [searchParams]);

  // ガチャ設定をURLにエンコード（短縮URLを生成）
  const generateShareUrl = async (config: GachaConfig, bonusConfig?: LoginBonusConfig | null): Promise<string> => {
    if (typeof window === 'undefined') return '';
    
    try {
      const { auth: authInstance } = initializeFirebase();
      if (authInstance) {
        // Firestoreに保存して短いIDを取得
        const shareId = await saveSharedConfig(config, bonusConfig);
        return `${window.location.origin}?share=${shareId}`;
      }
    } catch (error) {
      console.error('Failed to save shared config, falling back to long URL:', error);
    }
    
    // Firestoreが使えない場合は従来の長いURLを返す（後方互換性）
    const shareableConfig: any = {
      title: config.title,
      items: config.items.map(item => ({
        name: item.name,
        probability: item.probability,
      })),
      dailyLimit: config.dailyLimit,
    };
    
    if (bonusConfig) {
      shareableConfig.bonusConfig = {
        requiredDays: bonusConfig.requiredDays,
        bonusGachaName: bonusConfig.bonusGachaName,
        bonusItems: bonusConfig.bonusItems.map(item => ({
          name: item.name,
          probability: item.probability,
        })),
        bonusDailyLimit: bonusConfig.bonusDailyLimit,
      };
    }
    
    const encoded = encodeURIComponent(JSON.stringify(shareableConfig));
    return `${window.location.origin}?config=${encoded}`;
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    // URLから設定を読み込む（最優先）
    loadConfigFromUrl().then((urlData) => {
      if (!isMounted) return;
      
      if (urlData.config) {
        setGachaConfig(urlData.config);
        if (urlData.bonusConfig) {
          setLoginBonusConfig(urlData.bonusConfig);
        }
        // URLをクリーンアップ（オプション）
        // router.replace('/');
      }

      // Firebase初期化を試みる
      const { auth: authInstance } = initializeFirebase();
      
      // Firebaseが初期化されていない場合は、ストレージからデータを取得
      if (!authInstance) {
        const config = urlData.config || getGachaConfigFromStorage();
        const bonusConfig = urlData.bonusConfig || getLoginBonusConfigFromStorage();
        const count = getTodayGachaCountFromStorage();
        // ストレージに設定がない場合はデフォルト値を使用
        setGachaConfig(config || getDefaultGachaConfig());
        setLoginBonusConfig(bonusConfig);
        setTodayGachaCount(count);
        return;
      }

      // 認証状態の監視
      unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (!isMounted) return;
        
        setUser(user);
        if (user) {
          // URLから設定がある場合はそれを優先
          if (urlData.config) {
            setGachaConfig(urlData.config);
            if (urlData.bonusConfig) {
              setLoginBonusConfig(urlData.bonusConfig);
            }
            setTodayGachaCount(0);
            return;
          }
        
          // ログインユーザーの場合、DBからデータを取得
          const userData = await getUserGachaData(user.uid);
          if (!isMounted) return;
          
          if (userData) {
            // DBに設定がない場合はデフォルト値を使用
            setGachaConfig(userData.gachaConfig || getDefaultGachaConfig());
            setLoginBonusConfig(userData.loginBonusConfig || null);
            setTodayGachaCount(userData.todayGachaCount || 0);
            setConsecutiveLoginDays(userData.consecutiveLoginDays || 0);
          } else {
            // ユーザーデータがない場合はデフォルト値を使用
            setGachaConfig(getDefaultGachaConfig());
            setConsecutiveLoginDays(0);
          }
          // 連続ログイン日数を更新
          const updatedDays = await updateConsecutiveLoginDays(user.uid);
          if (isMounted) {
            setConsecutiveLoginDays(updatedDays);
          }
        } else {
          // URLから設定がある場合はそれを優先
          if (urlData.config) {
            setGachaConfig(urlData.config);
            if (urlData.bonusConfig) {
              setLoginBonusConfig(urlData.bonusConfig);
            }
            setTodayGachaCount(0);
            return;
          }
        
          // 非ログインユーザーの場合、ストレージから取得
          const config = getGachaConfigFromStorage();
          const bonusConfig = getLoginBonusConfigFromStorage();
          const count = getTodayGachaCountFromStorage();
          // ストレージに設定がない場合はデフォルト値を使用
          setGachaConfig(config || getDefaultGachaConfig());
          setLoginBonusConfig(bonusConfig);
          setTodayGachaCount(count);
        }
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [searchParams, loadConfigFromUrl]);

  // ガチャ設定が変更されたら共有URLを更新
  useEffect(() => {
    if (gachaConfig) {
      generateShareUrl(gachaConfig, loginBonusConfig).then((url) => {
        setShareUrl(url);
      });
    }
  }, [gachaConfig, loginBonusConfig]);

  const handleSpin = async () => {
    if (!gachaConfig) {
      alert('まずガチャ設定を行ってください');
      return;
    }

    // 日次制限チェック
    const limit = gachaConfig.dailyLimit;
    if (todayGachaCount >= limit) {
      alert(`今日は既に${limit}回ガチャを回しています。また明日お試しください！`);
      return;
    }

    // 確率バリデーション
    if (!validateProbabilities(gachaConfig.items)) {
      alert('ガチャ設定の確率の合計が100%になっていません。設定を確認してください。');
      return;
    }

    setIsSpinning(true);

    // ログインボーナス日かチェック
    let isBonusDay = false;
    if (user && loginBonusConfig) {
      const userData = await getUserGachaData(user.uid);
      if (userData && userData.consecutiveLoginDays >= loginBonusConfig.requiredDays) {
        isBonusDay = true;
      }
    }

    // 演出のため少し待つ
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // ガチャ実行
    const result = executeGacha(gachaConfig, loginBonusConfig || undefined, isBonusDay);

    // 回数を更新
    let newLoginDays = consecutiveLoginDays;
    if (user) {
      const newCount = await updateTodayGachaCount(user.uid);
      setTodayGachaCount(newCount);
      // DBに保存
      try {
        await saveGachaResult(user.uid, result);
      } catch (error) {
        console.error('ガチャ結果の保存エラー:', error);
        // エラーが発生しても続行
      }
      
      // 連続ログイン日数を再取得して、増加を確認
      try {
        const updatedDays = await updateConsecutiveLoginDays(user.uid);
        if (updatedDays > consecutiveLoginDays) {
          setLoginDaysIncreased(updatedDays);
          newLoginDays = updatedDays;
        }
        setConsecutiveLoginDays(updatedDays);
      } catch (error) {
        console.error('ログイン日数の更新エラー:', error);
        // エラーが発生しても続行
      }
    } else {
      const newCount = updateTodayGachaCountInStorage();
      setTodayGachaCount(newCount);
      // ストレージに保存
      saveGachaResultToStorage(result);
    }

    setGachaResult(result);
    setIsResultModalOpen(true);
    setIsSpinning(false);
  };

  const handleConfigSave = (config: GachaConfig, bonusConfig?: LoginBonusConfig) => {
    setGachaConfig(config);
    if (bonusConfig) {
      setLoginBonusConfig(bonusConfig);
    }
  };

  const handleShare = () => {
    if (!gachaConfig) return;
    setIsShareModalOpen(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('共有URLをクリップボードにコピーしました！');
    } catch (error) {
      // フォールバック：テキストエリアを使用
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('共有URLをクリップボードにコピーしました！');
    }
  };

  const remainingCount = gachaConfig ? gachaConfig.dailyLimit - todayGachaCount : 0;

  return (
    <main className="min-h-screen flex flex-col">
      <Header user={user} onAuthChange={setUser} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl font-bold mb-12 text-center">Gachaetto</h1>

        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-3">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-lg font-semibold"
            >
              ガチャ設定
            </button>
            {gachaConfig && (
              <button
                onClick={handleShare}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-lg font-semibold flex items-center gap-2"
                title="このガチャ設定を友達に共有"
              >
                <span>📤</span>
                <span>共有</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning || !gachaConfig || remainingCount <= 0}
            className={`px-16 py-6 text-2xl font-bold rounded-lg transition ${
              isSpinning || !gachaConfig || remainingCount <= 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transform hover:scale-105'
            }`}
          >
            {isSpinning ? '回転中...' : 'まわす'}
          </button>
          
          {gachaConfig && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                残り回数: {remainingCount} / {gachaConfig.dailyLimit}
              </p>
            </div>
          )}

          {gachaConfig && (
            <div className="mt-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                💡 <span className="font-semibold">共有機能:</span> 共有ボタンを押すと、現在のガチャ設定（タイトル・アイテム・確率・日次制限）をURLで共有できます
              </p>
            </div>
          )}

          {user && loginBonusConfig && (
            <div className="mt-4 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 text-center mb-2">
                🎁 ログインボーナス進捗
              </p>
              <div className="text-sm text-purple-700 dark:text-purple-300 text-center space-y-1">
                <p>
                  連続ログイン日数: <span className="font-bold text-lg">{consecutiveLoginDays}</span> 日
                </p>
                <p>
                  必要日数: <span className="font-semibold">{loginBonusConfig.requiredDays}</span> 日
                </p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((consecutiveLoginDays / loginBonusConfig.requiredDays) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs mt-1">
                  {consecutiveLoginDays >= loginBonusConfig.requiredDays ? (
                    <span className="text-green-600 dark:text-green-400 font-bold">✨ ボーナスガチャが利用可能です！</span>
                  ) : (
                    <span>あと {loginBonusConfig.requiredDays - consecutiveLoginDays} 日でボーナスガチャが利用可能になります</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 text-center mb-2">
              🎮 試しにログインしてみたい方向けアカウント
            </p>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 text-center space-y-1">
              <p>アカウントID: <span className="font-mono font-semibold">gatya</span></p>
              <p>パスワード: <span className="font-mono font-semibold">test</span></p>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            ガチャ設定や結果の保存、ログインボーナスを使用するにはログインが必要です。
          </p>

          <Link
            href="/history"
            className="mt-4 px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            ガチャ履歴を見る
          </Link>
        </div>
      </div>

      <GachaConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigSave}
        initialConfig={gachaConfig}
        initialBonusConfig={loginBonusConfig}
        user={user}
      />

      <GachaResultModal
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false);
          setLoginDaysIncreased(null); // モーダルを閉じる際にリセット
        }}
        result={gachaResult}
        gachaConfig={gachaConfig}
        remainingCount={remainingCount}
        loginDaysIncreased={loginDaysIncreased}
        loginBonusConfig={loginBonusConfig}
      />

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="ガチャ設定を共有"
      >
        {gachaConfig && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                共有される設定内容
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">タイトル:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{gachaConfig.title}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">日次制限:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{gachaConfig.dailyLimit}回</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300 block mb-2">アイテム一覧:</span>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {gachaConfig.items.map((item, index) => (
                      <li key={index} className="text-gray-900 dark:text-gray-100">
                        {item.name} - {item.probability}%
                      </li>
                    ))}
                  </ul>
                </div>
                {loginBonusConfig && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <div className="font-semibold text-purple-700 dark:text-purple-300 mb-2">
                      🎁 ログインボーナス設定
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">必要ログイン日数:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{loginBonusConfig.requiredDays}日</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">ボーナスガチャ名:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{loginBonusConfig.bonusGachaName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">ボーナスアイテム一覧:</span>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {loginBonusConfig.bonusItems.map((item, index) => (
                            <li key={index} className="text-gray-900 dark:text-gray-100">
                              {item.name} - {item.probability}%
                            </li>
                          ))}
                        </ul>
                      </div>
                      {loginBonusConfig.bonusDailyLimit && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">ボーナス日次制限:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{loginBonusConfig.bonusDailyLimit}回</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                共有URL
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold"
                >
                  コピー
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                このURLを共有すると、上記の設定でガチャを回すことができます。
              </p>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
