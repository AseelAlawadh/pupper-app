export interface Dog {
    dog_id: string;
    name: string;
    shelter_name: string;
    city: string;
    state: string;
    breed: string | null;
    species: string | null;
    shelter_entry_date: string;
    description: string | null;
    birthday: string;
    weight: number;
    color: string;
    sentiment_tags?: string[];
    image_url: string;
    original_key: string;
    resized_400_key: string;
    thumbnail_50_key: string;
    created_at: string;
    wags: number;
    growls: number;
    user_wagged?: boolean;
    user_growled?: boolean;
    images: string[];
}

