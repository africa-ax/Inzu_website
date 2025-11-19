const SUPABASE_URL = "https://lxojnqggqojejunxrqao.supabase.co";
const SUPABASE_ANON_KEY = "your_anon_key";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Upload example
async function uploadDocument(file, path) {
    const { data, error } = await supabase
        .storage
        .from("document") // private bucket
        .upload(path, file);

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}
