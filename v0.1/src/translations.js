// Japanese translations for karate terms - Sentence-level translations
const translations = {
    // Interface phrases
    'Karate Scoring System': 'カラテ スコアリング システム (Karate Scoring System)',
    'Fighting Competition': '組手競技 (Kumite Competition)',
    'Form Competition': '形競技 (Kata Competition)',
    'Select Competition Type': '競技タイプを選択 (Select Competition Type)',
    'Match Setup': '試合セットアップ (Match Setup)',
    'Tournament Setup': 'トーナメント セットアップ (Tournament Setup)',
    
    // Kumite phrases
    'Kumite Scoring': '組手 スコアリング (Kumite Scoring)',
    'Red Corner': '赤コーナー (Red Corner)',
    'Blue Corner': '青コーナー (Blue Corner)',
    'Fighter Name': '選手名 (Fighter Name)',
    'Club/Team': 'クラブ/チーム (Club/Team)',
    'Start Kumite Match': '組手試合開始 (Start Kumite Match)',
    
    // Kata phrases
    'Kata Competition': '形競技 (Kata Competition)',
    'Traditional 1v1': '伝統的1対1 (Traditional 1v1)',
    'Tournament Style': 'トーナメント形式 (Tournament Style)',
    'Judge Panel': '審判パネル (Judge Panel)',
    'Technical Score': '技術点 (Technical Score)',
    'Athletic Score': '運動点 (Athletic Score)',
    
    // Scoring terms
    'Yuko (1 point)': '有効 1ポイント (Yūkō 1 Point)',
    'Waza-ari (2 points)': '技あり 2ポイント (Waza-ari 2 Points)',
    'Ippon (3 points)': '一本 3ポイント (Ippon 3 Points)',
    
    // Actions
    'Start Match': '試合開始 (Start Match)',
    'End Match': '試合終了 (End Match)',
    'Reset Match': '試合リセット (Reset Match)',
    'Medical Timeout': '医療タイムアウト (Medical Timeout)',
    'Display Screen': 'ディスプレイ画面 (Display Screen)',
    'Back to Main': 'メインに戻る (Back to Main)',
    
    // Status messages
    'Match in Progress': '試合進行中 (Match in Progress)',
    'Waiting for Scores': 'スコア待ち (Waiting for Scores)',
    'Performance Started': '演技開始 (Performance Started)',
    'Performance Ended': '演技終了 (Performance Ended)',
    'Tournament Winner': 'トーナメント優勝者 (Tournament Winner)',
    
    // Single word translations (for backwards compatibility)
    'Back': '戻る (Back)',
    'Start': 'スタート (Start)',
    'Pause': '一時停止 (Pause)',
    'Reset': 'リセット (Reset)',
    'Ready': '準備完了 (Ready)'
};

function translate(text) {
    // Try exact match first
    if (translations[text]) {
        return translations[text];
    }
    
    // Try to find partial matches for common terms
    for (const [key, value] of Object.entries(translations)) {
        if (text.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return text;
}

// Helper function to get just the Japanese part
function getJapanese(text) {
    const translated = translate(text);
    const match = translated.match(/^([^(]+)/);
    return match ? match[1].trim() : translated;
}

// Helper function to get just the romanization
function getRomanization(text) {
    const translated = translate(text);
    const match = translated.match(/\(([^)]+)\)/);
    return match ? match[1] : text;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, translate };
}