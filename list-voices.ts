import "dotenv/config";

async function listVoices() {
  console.log("🔍 Checking ElevenLabs API Key and Voices...");
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ No API key found in .env");
    return;
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey }
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Success! Found ${data.voices.length} voices.`);
    console.log("First 3 voices:", data.voices.slice(0, 3).map((v: any) => `${v.name} (${v.voice_id})`));
  } else {
    const errorBody = await response.text();
    console.error(`❌ API Error ${response.status}:`, errorBody);
  }
}

listVoices();
