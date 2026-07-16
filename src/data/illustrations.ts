// ソコスト（https://soco-st.com）由来イラストの寸法の正本（LpSteps で使用するもの）。
// 画像を差し替えたらここの寸法も更新する。
export interface Illustration {
  src: string;
  width: number;
  height: number;
}

export const ill = {
  magnifier: { src: '/images/ill-magnifier.svg', width: 142, height: 285 },
  document: { src: '/images/ill-document.svg', width: 215, height: 199 },
  meeting: { src: '/images/ill-meeting.svg', width: 398, height: 247 },
  growth: { src: '/images/ill-growth.svg', width: 458, height: 345 },
  handshake: { src: '/images/ill-handshake.svg', width: 365, height: 239 },
  shieldpc: { src: '/images/ill-shieldpc.svg', width: 255, height: 282 },
} satisfies Record<string, Illustration>;
