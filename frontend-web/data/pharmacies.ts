export interface PharmacyMedicine {
  name: string;
  price: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface Pharmacy {
  id: string;
  name: string;
  image: string;
  price: number; // base price for search
  distance: number; 
  rating: number;
  reviews: number;
  status: "In Stock" | "Low Stock";
  isOpen: boolean;
  hours: string;
  phone: string;
  address: string;
  medicines: PharmacyMedicine[];
  announcements?: any[];
}

const MOCK_INVENTORY: PharmacyMedicine[] = [
  { name: "Acetaminophen Ultra", price: 350, stockStatus: "In Stock" },
  { name: "Ibuprofen Softgels", price: 250, stockStatus: "In Stock" },
  { name: "Naproxen Sodium", price: 420, stockStatus: "Low Stock" },
  { name: "Dual Action Cold Caps", price: 510, stockStatus: "In Stock" },
  { name: "Muscle Ease Gel", price: 320, stockStatus: "In Stock" },
  { name: "Low Dose Aspirin", price: 180, stockStatus: "In Stock" },
  { name: "Amoxicillin", price: 690, stockStatus: "In Stock" },
  { name: "Atorvastatin Calcium", price: 1250, stockStatus: "In Stock" },
  { name: "Metformin Hydrochloride", price: 440, stockStatus: "Low Stock" },
  { name: "Azithromycin", price: 890, stockStatus: "In Stock" },
  { name: "Lisinopril", price: 510, stockStatus: "Low Stock" },
  { name: "Insulin Glargine", price: 2600, stockStatus: "In Stock" },
];

export const pharmacies: Pharmacy[] = [
  {
    id: "p1",
    name: "Red Cross Pharmacy",
    image: "https://images.unsplash.com/photo-1538108149393-fdfd81895907?auto=format&fit=crop&q=80&w=800",
    price: 450.00,
    distance: 0.8,
    rating: 4.8,
    reviews: 124,
    status: "In Stock",
    isOpen: true,
    hours: "24/7",
    phone: "+251 11 551 9078",
    address: "Bole Road, Addis Ababa",
    medicines: MOCK_INVENTORY,
  },
  {
    id: "p2",
    name: "Kenema Pharmacy",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    price: 425.50,
    distance: 1.2,
    rating: 4.5,
    reviews: 89,
    status: "In Stock",
    isOpen: true,
    hours: "8:00 AM - 10:00 PM",
    phone: "+251 11 155 3133",
    address: "Piazza, Addis Ababa",
    medicines: MOCK_INVENTORY,
  },
  {
    id: "p3",
    name: "Lion Pharmacy",
    image: "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=800",
    price: 480.00,
    distance: 2.5,
    rating: 4.9,
    reviews: 210,
    status: "Low Stock",
    isOpen: true,
    hours: "24/7",
    phone: "+251 11 551 1100",
    address: "Kazanchis, Addis Ababa",
    medicines: MOCK_INVENTORY,
  },
  {
    id: "p4",
    name: "Ethio-Medical Pharmacy",
    image: "https://images.unsplash.com/photo-1576091160550-2173bdb999ef?auto=format&fit=crop&q=80&w=800",
    price: 440.00,
    distance: 3.1,
    rating: 4.3,
    reviews: 56,
    status: "In Stock",
    isOpen: false,
    hours: "8:30 AM - 9:00 PM",
    phone: "+251 11 371 1234",
    address: "Sarbet, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p5",
    name: "Sheger Pharmacy",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800",
    price: 410.00,
    distance: 4.5,
    rating: 4.6,
    reviews: 142,
    status: "Low Stock",
    isOpen: true,
    hours: "24/7",
    phone: "+251 11 661 5678",
    address: "Megenagna, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p6",
    name: "Abyssinia Pharmacy",
    image: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800",
    price: 465.00,
    distance: 1.5,
    rating: 4.7,
    reviews: 78,
    status: "In Stock",
    isOpen: true,
    hours: "8:00 AM - 11:00 PM",
    phone: "+251 11 662 9012",
    address: "Bole Medhanialem, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p7",
    name: "Zewditu Pharmacy",
    image: "https://images.unsplash.com/photo-1563361141396-840b1a22f429?auto=format&fit=crop&q=80&w=800",
    price: 435.00,
    distance: 5.2,
    rating: 4.4,
    reviews: 67,
    status: "In Stock",
    isOpen: true,
    hours: "24/7",
    phone: "+251 11 551 8185",
    address: "Kirkos, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p8",
    name: "Unity Pharmacy",
    image: "https://images.unsplash.com/photo-1631549916768-4119b295f7a6?auto=format&fit=crop&q=80&w=800",
    price: 495.00,
    distance: 0.5,
    rating: 4.9,
    reviews: 320,
    status: "Low Stock",
    isOpen: true,
    hours: "9:00 AM - 8:00 PM",
    phone: "+251 11 372 4567",
    address: "Old Airport, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p9",
    name: "Modern Health Pharmacy",
    image: "https://images.unsplash.com/photo-1586773860418-d3b97978c651?auto=format&fit=crop&q=80&w=800",
    price: 420.00,
    distance: 6.8,
    rating: 4.2,
    reviews: 45,
    status: "In Stock",
    isOpen: true,
    hours: "8:00 AM - 10:00 PM",
    phone: "+251 11 645 7890",
    address: "Summit, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  {
    id: "p10",
    name: "LifeCare Pharmacy",
    image: "https://images.unsplash.com/photo-1664447962596-13c058a2c8a2?auto=format&fit=crop&q=80&w=800",
    price: 455.00,
    distance: 2.2,
    rating: 4.8,
    reviews: 156,
    status: "In Stock",
    isOpen: true,
    hours: "24/7",
    phone: "+251 11 629 3456",
    address: "Gerji, Addis Ababa",
    medicines: MOCK_INVENTORY
  },
  // Adding placeholders for others to ensure no errors
  ...["p11","p12","p13","p14","p15","p16","p17","p18","p19","p20"].map(id => ({
    id, name: `${id.toUpperCase()} Pharmacy`, image: "https://images.unsplash.com/photo-1538108149393-fdfd81895907?auto=format&fit=crop&q=80&w=800",
    price: 400 + Math.random() * 100, distance: Math.random() * 10, rating: 4 + Math.random(), reviews: Math.floor(Math.random() * 200),
    status: "In Stock" as const, isOpen: true, hours: "24/7", phone: "+251 11 000 0000", address: "Addis Ababa, Ethiopia", medicines: MOCK_INVENTORY
  }))
];
