import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';

// Multer memory storage: we pass file buffer to Gemini Vision
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractionJsonSchema = `{
  "age": null,
  "gender": null,
  "conditions": [],
  "hba1c": null,
  "fastingSugar": null,
  "cholesterol": {"total": null, "ldl": null, "hdl": null},
  "bloodPressure": {"systolic": null, "diastolic": null},
  "vitaminD": null,
  "hemoglobin": null,
  "bmiIndicators": [],
  "recommendations": []
}`;

function safeParseJson(text) {
  if (!text) return null;
  // Remove markdown fences if Gemini wraps JSON
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function analyzeWithGeminiVision(file) {
  // Gemini accepts image data; for PDF we still send bytes (Vision should handle if supported)
  // We provide MIME type and raw bytes.
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are a medical report analysis AI for nutrition personalization.\n\nAnalyze this medical report image (PDF or picture).\n\nExtract ONLY nutrition-related health metrics needed for meal planning.\n\nHard constraints:\n- Return ONLY valid JSON (no markdown, no explanations, no extra text).\n- Never include lab IDs, doctor names, hospital addresses, patient IDs, billing info, or prescription numbers.\n- Do not guess values not present; use null when missing.\n- Do not diagnose or prescribe medicines. Provide recommendations only as general dietary guidance.\n\nReturn JSON matching this exact schema (use nulls/empty arrays as needed):\n${extractionJsonSchema}\n\nHere is the medical report file:\n`;

  // Use inlineData
  const mimeType = file.mimetype || 'application/octet-stream';
  const base64 = file.buffer.toString('base64');

  console.log('Gemini request payload:', {
    mimeType,
    base64Length: base64?.length,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
  });

  const responseText = result?.response?.text?.() ?? '';
  console.log('Gemini response received');
  console.log('Response preview:', responseText?.substring(0, 500));

  try {
    const parsed = safeParseJson(responseText);
    if (!parsed) throw new Error('Gemini returned invalid JSON');
    return parsed;
  } catch (error) {
    console.error('JSON Parse Error:', error);
    throw error;
  }
}

// Handler: expects multer to already have placed file on req.file
export const extractReport = async (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production';
  try {
    console.log('=== REPORT EXTRACTION START ===');
    console.log('File received:', !!req.file);

    if (req.file) {
      console.log('File name:', req.file.originalname);
      console.log('Mime type:', req.file.mimetype);
      console.log('File size:', req.file.size);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Report extraction failed',
        errorCode: 'NO_FILE_RECEIVED',
        ...(isDev ? { details: 'No file was received by multer (req.file is empty).' } : {}),
      });
    }

    // Basic allowlist
    const allowed = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);
    const mime = req.file.mimetype;
    if (mime && !allowed.has(mime)) {
      return res.status(400).json({
        success: false,
        message: 'Report extraction failed',
        errorCode: 'UNSUPPORTED_MIME_TYPE',
        ...(isDev ? { details: `Unsupported MIME type: ${mime}` } : {}),
      });
    }

    console.log('Sending report to Gemini Vision...');
    const analysis = await analyzeWithGeminiVision(req.file);
    console.log('Gemini response received');

    // Normalize to required schema (best-effort)
    const normalized = {
      age: analysis.age ?? null,
      gender: analysis.gender ?? null,
      conditions: Array.isArray(analysis.conditions) ? analysis.conditions : [],
      hba1c: analysis.hba1c ?? null,
      fastingSugar: analysis.fastingSugar ?? null,
      cholesterol: analysis.cholesterol || { total: null, ldl: null, hdl: null },
      bloodPressure: analysis.bloodPressure || { systolic: null, diastolic: null },
      vitaminD: analysis.vitaminD ?? null,
      hemoglobin: analysis.hemoglobin ?? null,
      bmiIndicators: Array.isArray(analysis.bmiIndicators) ? analysis.bmiIndicators : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    };

    return res.status(200).json({
      success: true,
      data: normalized,
    });
  } catch (err) {
    // If parsing fails, log the real error
    console.error('JSON Parse Error:', err);
    console.error('[reportAnalysisController] extractReport failed:', err);

    return res.status(200).json({
      success: false,
      message: 'Unable to extract medical information.',
      ...(isDev ? {
        message: 'Report extraction failed',
        errorCode: 'REPORT_EXTRACTION_FAILED',
        details: err?.message || String(err),
      } : {}),
    });
  }
};


// Export multer middleware so routes can use it
export const reportUploadMiddleware = upload.single('file');

