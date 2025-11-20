'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, initializeFirebase } from '@/lib/firebase/config';
import Header from '@/components/Header';
import GachaConfigModal from '@/components/GachaConfigModal';
import GachaResultModal from '@/components/GachaResultModal';
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

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [gachaConfig, setGachaConfig] = useState<GachaConfig | null>(getDefaultGachaConfig());
  const [loginBonusConfig, setLoginBonusConfig] = useState<LoginBonusConfig | null>(null);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [todayGachaCount, setTodayGachaCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  // URLクエリパラメータからガチャ設定を読み込む
  const loadConfigFromUrl = (): GachaConfig | null => {
    const configParam = searchParams.get('config');
    if (!configParam) return null;

    try {
      const decoded = decodeURIComponent(configParam);
      const config = JSON.parse(decoded);
      
      // バリデーション
      if (config.title && config.items && Array.isArray(config.items) && config.dailyLimit) {
        // IDを再生成
        const itemsWithIds = config.items.map((item: any, index: number) => ({
          id: (index + 1).toString(),
          name: item.name || '',
          probability: item.probability || 0,
        }));
        
        return {
          title: config.title,
          items: itemsWithIds,
          dailyLimit: config.dailyLimit,
        };
      }
    } catch (error) {
      console.error('Failed to parse config from URL:', error);
    }
    
    return null;
  };

  // ガチャ設定をURLにエンコード
  const generateShareUrl = (config: GachaConfig): string => {
    if (typeof window === 'undefined') return '';
    
    const shareableConfig = {
      title: config.title,
      items: config.items.map(item => ({
        name: item.name,
        probability: item.probability,
      })),
      dailyLimit: config.dailyLimit,
    };
    
    const encoded = encodeURIComponent(JSON.stringify(shareableConfig));
    return `${window.location.origin}?config=${encoded}`;
  };

  useEffect(() => {
    // URLから設定を読み込む（最優先）
    const urlConfig = loadConfigFromUrl();
    if (urlConfig) {
      setGachaConfig(urlConfig);
      // URLをクリーンアップ（オプション）
      // router.replace('/');
    }

    // Firebase初期化を試みる
    const { auth: authInstance } = initializeFirebase();
    
    // Firebaseが初期化されていない場合は、ストレージからデータを取得
    if (!authInstance) {
      const config = urlConfig || getGachaConfigFromStorage();
      const bonusConfig = getLoginBonusConfigFromStorage();
      const count = getTodayGachaCountFromStorage();
      // ストレージに設定がない場合はデフォルト値を使用
      setGachaConfig(config || getDefaultGachaConfig());
      setLoginBonusConfig(bonusConfig);
      setTodayGachaCount(count);
      return;
    }

    // 認証状態の監視
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setUser(user);
      if (user) {
        // URLから設定がある場合はそれを優先
        if (urlConfig) {
          setGachaConfig(urlConfig);
          setTodayGachaCount(0);
          return;
        }
        
        // ログインユーザーの場合、DBからデータを取得
        const userData = await getUserGachaData(user.uid);
        if (userData) {
          // DBに設定がない場合はデフォルト値を使用
          setGachaConfig(userData.gachaConfig || getDefaultGachaConfig());
          setLoginBonusConfig(userData.loginBonusConfig || null);
          setTodayGachaCount(userData.todayGachaCount || 0);
        } else {
          // ユーザーデータがない場合はデフォルト値を使用
          setGachaConfig(getDefaultGachaConfig());
        }
        // 連続ログイン日数を更新
        await updateConsecutiveLoginDays(user.uid);
      } else {
        // URLから設定がある場合はそれを優先
        if (urlConfig) {
          setGachaConfig(urlConfig);
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

    return () => unsubscribe();
  }, [searchParams]);

  // ガチャ設定が変更されたら共有URLを更新
  useEffect(() => {
    if (gachaConfig) {
      setShareUrl(generateShareUrl(gachaConfig));
    }
  }, [gachaConfig]);

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
    if (user) {
      const newCount = await updateTodayGachaCount(user.uid);
      setTodayGachaCount(newCount);
      // DBに保存
      await saveGachaResult(user.uid, result);
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

  const handleShare = async () => {
    if (!gachaConfig) return;
    
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
        onClose={() => setIsResultModalOpen(false)}
        result={gachaResult}
        gachaConfig={gachaConfig}
        remainingCount={remainingCount}
      />
    </main>
  );
}
