export const DEFAULT_GROUPS = [
  { name: "Day to Day Expenses", is_default: true },
  { name: "Annual Expenses", is_default: false },
];

/** Categories seeded for the "Day to Day Expenses" group. */
export const DAY_TO_DAY_CATEGORIES = [
  {
    name: "Housing & Utilities",
    keywords: [
      "rent", "mortgage", "electricity", "water", "internet",
      "maintenance", "jio", "airtel", "bescom", "gas",
    ],
  },
  {
    name: "Groceries",
    keywords: [
      "blinkit", "zepto", "instamart", "dmart", "bigbasket",
      "supermarket", "grocery",
    ],
  },
  {
    name: "Food & Dining",
    keywords: [
      "swiggy", "zomato", "restaurant", "cafe", "mcdonalds",
      "kfc", "starbucks", "dominos", "bar", "pub",
    ],
  },
  {
    name: "Transportation",
    keywords: [
      "uber", "ola", "petrol", "shell", "parking",
      "toll", "fastag", "metro", "flight", "train",
    ],
  },
  {
    name: "Shopping & Lifestyle",
    keywords: [
      "amazon", "flipkart", "myntra", "zara", "clothing",
      "electronics", "nykaa", "salon",
    ],
  },
  {
    name: "Health & Wellness",
    keywords: [
      "pharmacy", "apollo", "doctor", "hospital",
      "gym", "cult", "fitness", "medicine",
    ],
  },
  {
    name: "Entertainment & Subs",
    keywords: [
      "netflix", "spotify", "prime", "hotstar", "movie",
      "bookmyshow", "pvr", "concert",
    ],
  },
  {
    name: "Miscellaneous",
    keywords: ["gift", "donation", "cash", "atm", "fee", "penalty"],
  },
];

/** Categories seeded for the "Annual Expenses" group. */
export const ANNUAL_CATEGORIES = [
  {
    name: "Insurance & Premiums",
    keywords: [
      "lic", "health insurance", "car insurance", "term plan",
      "premium", "policy", "icici prudential", "hdfc life",
    ],
  },
  {
    name: "Subscriptions & Memberships",
    keywords: [
      "netflix", "spotify", "prime", "youtube", "icloud",
      "google one", "disney", "hotstar", "gym membership", "club",
    ],
  },
  {
    name: "Taxes & EMIs",
    keywords: [
      "income tax", "property tax", "emi", "loan", "gst",
      "advance tax", "tds", "home loan",
    ],
  },
  {
    name: "Travel & Vacations",
    keywords: [
      "flight", "hotel", "airbnb", "makemytrip", "goibibo",
      "booking", "visa", "resort", "holiday",
    ],
  },
  {
    name: "Gifts & Celebrations",
    keywords: [
      "birthday", "anniversary", "wedding", "diwali",
      "christmas", "gift", "party", "housewarming",
    ],
  },
  {
    name: "Home Improvement",
    keywords: [
      "furniture", "appliance", "renovation", "paint",
      "plumber", "electrician", "interior", "repair",
    ],
  },
  {
    name: "Education",
    keywords: [
      "tuition", "course", "udemy", "coursera",
      "books", "school", "college", "certification",
    ],
  },
  {
    name: "Investments",
    keywords: [
      "sip", "mutual fund", "stocks", "fd",
      "ppf", "nps", "gold", "crypto",
    ],
  },
  {
    name: "Miscellaneous",
    keywords: ["donation", "fee", "penalty", "registration", "renewal"],
  },
];

/** Backwards-compat alias — points to Day to Day categories. */
export const DEFAULT_CATEGORIES = DAY_TO_DAY_CATEGORIES;

/** Map group name → its default categories. */
export const CATEGORIES_BY_GROUP: Record<string, typeof DAY_TO_DAY_CATEGORIES> = {
  "Day to Day Expenses": DAY_TO_DAY_CATEGORIES,
  "Annual Expenses": ANNUAL_CATEGORIES,
};
