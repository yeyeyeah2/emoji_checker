import type { EmojiType } from '../api/types';

export interface EmojiOption {
  type: EmojiType;
  emoji: string;
  label: string;
  description: string;
  color: string;
  soft: string;
}

export const EMOJI_OPTIONS: EmojiOption[] = [
  { type: 'HAPPY', emoji: '😊', label: '开心', description: '内容很有趣，我听懂了', color: '#eda100', soft: '#fff4d6' },
  { type: 'SAD', emoji: '😢', label: '难过', description: '有点受挫，没跟上', color: '#2a78d6', soft: '#e8f2fd' },
  { type: 'ANGRY', emoji: '😠', label: '生气', description: '感到不满或烦躁', color: '#e34948', soft: '#fdeaea' },
  { type: 'FEARFUL', emoji: '😨', label: '紧张', description: '有点焦虑或害怕', color: '#6250d6', soft: '#eeecfc' },
  { type: 'SURPRISED', emoji: '😮', label: '惊讶', description: '有意外收获或疑问', color: '#eb6834', soft: '#fdf0e9' },
  { type: 'NEUTRAL', emoji: '😐', label: '平静', description: '状态一般，没什么波动', color: '#1baf7a', soft: '#e7f7f1' },
];

const BY_TYPE = new Map(EMOJI_OPTIONS.map((option) => [option.type, option]));

export function emojiOption(type: EmojiType): EmojiOption {
  return BY_TYPE.get(type) ?? EMOJI_OPTIONS[0];
}
