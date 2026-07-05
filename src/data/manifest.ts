export interface SubCategory {
  id: string;
  label: string;
  commonsCategory: string;
}

export interface Edition {
  id: string;
  title: string;
  description: string;
  categories: SubCategory[];
}

export const EDITIONS: Edition[] = [
  {
    id: "art-archives",
    title: "Art & Archives Edition",
    description: "Engravings, scientific prints, decorative patterns & space photography from the public record.",
    categories: [
      { id: "engravings",  label: "Engravings & Etchings",    commonsCategory: "Engravings" },
      { id: "botanical",   label: "Botanical Illustrations",   commonsCategory: "Botanical_illustrations" },
      { id: "scientific",  label: "Scientific Illustration",   commonsCategory: "Scientific_illustration" },
      { id: "art-nouveau", label: "Art Nouveau & Decorative",  commonsCategory: "Art_Nouveau_illustrations" },
      { id: "space",       label: "NASA & Space",              commonsCategory: "Images_from_NASA" },
      { id: "patterns",    label: "Historic Patterns",         commonsCategory: "Ornamental_patterns" },
    ],
  },
];
