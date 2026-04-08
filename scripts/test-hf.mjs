import fs from 'fs';

async function testHFApi() {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync('./public/hero-dermatology-ai.png');
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('file', blob, 'hero-dermatology-ai.png');

  try {
    const res = await fetch('https://giridharanks-derma-ai-api.hf.space/predict', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    fs.writeFileSync('response.json', text);
    console.log("RESPONSE HTTP:", res.status);
    console.log("Wrote to response.json");
  } catch(e) {
    console.error("ERROR", e);
  }
}

testHFApi();
