import type { CSSProperties } from 'react';
import {
  ArrowDownLeft,
  Ban,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  ChartNoAxesColumn,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  CircleX,
  ClipboardList,
  Copy,
  CreditCard,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  Globe,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  Lock,
  LockOpen,
  LogIn,
  MessageCircleQuestion,
  Minus,
  Monitor,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  RotateCw,
  Scale,
  Search,
  Send,
  Settings2,
  Sheet,
  ShieldAlert,
  ShieldHalf,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
  Undo2,
  UserPlus,
  UserRound,
  UserX,
  Users,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';

/**
 * Nomes em kebab-case como no Lucide — é assim que os protótipos e os dados
 * de navegação referenciam o ícone. Registro explícito para preservar o
 * tree-shaking; o protótipo carregava a máscara do CDN, o que a aplicação
 * real não deve fazer.
 */
const REGISTRY = {
  'arrow-down-left': ArrowDownLeft,
  'arrow-left': ArrowLeft,
  'arrow-left-right': ArrowLeftRight,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  ban: Ban,
  'calendar-days': CalendarDays,
  camera: Camera,
  'chart-no-axes-column': ChartNoAxesColumn,
  check: Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-plus': CirclePlus,
  'circle-x': CircleX,
  'clipboard-list': ClipboardList,
  copy: Copy,
  'credit-card': CreditCard,
  'file-down': FileDown,
  'file-spreadsheet': FileSpreadsheet,
  'flask-conical': FlaskConical,
  globe: Globe,
  inbox: Inbox,
  'key-round': KeyRound,
  landmark: Landmark,
  'layout-dashboard': LayoutDashboard,
  link: LinkIcon,
  list: List,
  lock: Lock,
  'lock-open': LockOpen,
  'log-in': LogIn,
  'message-circle-question': MessageCircleQuestion,
  minus: Minus,
  monitor: Monitor,
  paperclip: Paperclip,
  pencil: Pencil,
  plus: Plus,
  'receipt-text': ReceiptText,
  'rotate-ccw': RotateCcw,
  'rotate-cw': RotateCw,
  scale: Scale,
  search: Search,
  send: Send,
  'settings-2': Settings2,
  sheet: Sheet,
  'shield-alert': ShieldAlert,
  'shield-half': ShieldHalf,
  smartphone: Smartphone,
  sparkles: Sparkles,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  'undo-2': Undo2,
  'user-plus': UserPlus,
  'user-round': UserRound,
  'user-x': UserX,
  users: Users,
  wallet: Wallet,
  'wifi-off': WifiOff,
  x: X,
} as const;

export type IconName = keyof typeof REGISTRY;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, color = 'currentColor', style, className }: IconProps) {
  const Glyph = REGISTRY[name];
  return (
    <Glyph
      aria-hidden="true"
      size={size}
      color={color}
      strokeWidth={2}
      className={className}
      style={{ flex: '0 0 auto', ...style }}
    />
  );
}
