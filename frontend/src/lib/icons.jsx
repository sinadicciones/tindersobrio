// Central lucide icon registry so JSX can resolve icons by string name.
// Keep this list in sync with the design system in /app/mockups/rediseno-v1.html.
import {
  Compass, Users, CalendarHeart, MessageCircle, CircleUserRound,
  HeartHandshake, Smile, Heart,
  MapPin, Sprout, PencilLine, SlidersHorizontal, LifeBuoy, ExternalLink,
  CalendarDays, Globe, Plus, Send, Flag, Ban, LogOut, Settings, ArrowLeft, Sparkles,
  Coffee, Mountain, Trees, Landmark, Clapperboard, UtensilsCrossed, Dumbbell,
  Volleyball, Flower2, BookOpen, Palette, Dice5, Dog, Music, MountainSnow, IceCreamCone,
  CheckCircle2, AlertTriangle, ChevronRight, Phone, X, Camera, MoreVertical,
  Footprints,
} from "lucide-react";

const REGISTRY = {
  Compass, Users, CalendarHeart, MessageCircle, CircleUserRound,
  HeartHandshake, Smile, Heart,
  MapPin, Sprout, PencilLine, SlidersHorizontal, LifeBuoy, ExternalLink,
  CalendarDays, Globe, Plus, Send, Flag, Ban, LogOut, Settings, ArrowLeft, Sparkles,
  Coffee, Mountain, Trees, Landmark, Clapperboard, UtensilsCrossed, Dumbbell,
  Volleyball, Flower2, BookOpen, Palette, Dice5, Dog, Music, MountainSnow, IceCreamCone,
  CheckCircle2, AlertTriangle, ChevronRight, Phone, X, Camera, MoreVertical, Footprints,
};

// Render a lucide icon by name — falls back to Sparkles when the icon key is unknown.
export function Icon({ name, size = 20, strokeWidth = 1.9, className, ...rest }) {
  const Cmp = REGISTRY[name] || Sparkles;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}

// Emoji fallback → lucide icon key. Used to translate legacy DB emojis (group emoji, etc.)
// into the new visual system without a database migration.
export const emojiToIconName = {
  "☕": "Coffee",
  "🥾": "Mountain",
  "🌳": "Trees",
  "🏛️": "Landmark",
  "🎬": "Clapperboard",
  "🍽️": "UtensilsCrossed",
  "🏃": "Footprints",
  "⚽": "Volleyball",
  "🧘": "Flower2",
  "📚": "BookOpen",
  "🎨": "Palette",
  "🎲": "Dice5",
  "🐶": "Dog",
  "🎵": "Music",
  "🧗": "MountainSnow",
  "🍦": "IceCreamCone",
  "🌱": "Sprout",
};

export function iconForActivity(activity) {
  if (!activity) return "Sparkles";
  return activity.icon || emojiToIconName[activity.emoji] || "Sparkles";
}
