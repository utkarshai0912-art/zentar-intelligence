import {
  Image,
  Palette,
  Wand2,
  MessageSquare,
  Globe,
  Handshake,
  Smartphone,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export const TOOL_ICONS: Record<string, LucideIcon> = {
  'thumbnail-analyser': Image,
  'thumbnail-maker': Palette,
  'logo-prompter': Wand2,
  'message-writer': MessageSquare,
  'web-prompter': Globe,
  'objection-handler': Handshake,
  'ugc-ads-prompter': Smartphone,
  'script-writer': FileText,
};

export const DEFAULT_ICON = Wand2;
