// App display config. Adjust to the coaching centre's own name / hotline.
export const COACHING_NAME = 'শাকিল স্যারের গণিত প্রাইভেট';
export const TAGLINE = 'গণিত শিখি ও শেখাই';
export const HOTLINE = '01812665475';

// Academic years for the pickers — from 2024 through three years ahead of today,
// so the list extends automatically and never needs a manual bump.
export const YEAR_OPTIONS: number[] = (() => {
  const end = new Date().getFullYear() + 3;
  return Array.from({ length: end - 2024 + 1 }, (_, i) => 2024 + i);
})();

export const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];
