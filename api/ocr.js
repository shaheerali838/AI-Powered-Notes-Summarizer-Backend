import { createWorker } from "tesseract.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const formData = await new Promise((resolve, reject) => {
      const data = [];
      req.on("data", (chunk) => data.push(chunk));
      req.on("end", () => resolve(Buffer.concat(data)));
      req.on("error", reject);
    });

    // Convert buffer -> base64 (for tesseract)
    const imageBase64 = formData.toString("base64");

    const worker = await createWorker("eng");
    const { data } = await worker.recognize(Buffer.from(imageBase64, "base64"));
    await worker.terminate();

    return res.status(200).json({ text: data.text });
  } catch (err) {
    console.error("OCR error:", err);
    return res.status(500).json({ error: err.message });
  }
}
