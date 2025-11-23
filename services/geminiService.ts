import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import type { SourceImage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Extracts the base64 image data from a Gemini API response.
 * @param response - The response object from the API.
 * @returns The base64 encoded image string, or null if not found.
 */
const extractBase64Image = (response: GenerateContentResponse): string | null => {
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/**
 * Describes an interior design image to generate a prompt.
 * @param sourceImage - The source image object.
 * @returns A promise that resolves to a descriptive string.
 */
export const describeInteriorImage = async (sourceImage: SourceImage): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }
  
  const engineeredPrompt = "As an expert interior designer, describe the provided image of a room in Vietnamese. Focus on the style (e.g., modern, minimalist, classic), key materials (e.g., wood floors, marble countertops), furniture, and the overall lighting and mood. The description should be suitable for use as a prompt to regenerate the image. Be descriptive and detailed.";

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: sourceImage.base64, mimeType: sourceImage.mimeType } },
        { text: engineeredPrompt },
      ],
    },
  });

  return response.text.trim();
};

/**
 * Generates multiple images based on a source image and a text prompt.
 * @param sourceImage - The source image object containing base64 data and mimeType.
 * @param prompt - The text prompt to guide the image generation.
 * @param renderType - The type of render, either 'exterior', 'interior', or 'floorplan'.
 * @param count - The number of images to generate.
 * @param referenceImage - An optional reference image for style, tone, and mood.
 * @param isAnglePrompt - A boolean to indicate if the prompt is for changing the angle.
 * @param useRawPrompt - A boolean to indicate if the provided prompt should be used as-is, without further engineering.
 * @returns A promise that resolves to an array of base64 image URLs.
 */
export const generateImages = async (
  sourceImage: SourceImage,
  prompt: string,
  renderType: 'exterior' | 'interior' | 'floorplan',
  count: number = 4,
  referenceImage: SourceImage | null = null,
  isAnglePrompt: boolean = false,
  useRawPrompt: boolean = false
): Promise<string[]> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }

  const generationPromises = Array(count).fill(0).map(async () => {
    let textPart = { text: prompt };
    const parts: any[] = [
      {
        inlineData: {
          data: sourceImage.base64,
          mimeType: sourceImage.mimeType,
        },
      },
    ];

    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.base64,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    if (useRawPrompt) {
        // Use the prompt as-is from the caller.
    } else if (renderType === 'floorplan') {
      textPart.text = `You are an expert 3D architectural visualizer. Your task is to convert the provided 2D floorplan image into a photorealistic 3D interior render, viewed from a human-eye level perspective inside the room. Adhere strictly to the layout, dimensions, and placement of walls, doors, and windows as shown in the floorplan. The user's request is: "${prompt}". Create a beautiful and realistic image based on these instructions.`;
    } else if (isAnglePrompt) {
        const subject = renderType === 'exterior' ? 'building' : 'room';
        const sketchType = renderType === 'exterior' ? 'architectural sketch' : 'interior sketch';
        textPart.text = `The user wants to change the camera angle of the provided ${sketchType}. Render the exact same ${subject} from the image, but from this new perspective: "${prompt}". The prompt's main goal is to define the camera shot, not to add new content to the scene.`;
    } else if (referenceImage) {
        const subjectType = renderType === 'exterior' ? 'building' : 'room';
        const shotType = renderType === 'exterior' ? 'exterior shot' : 'interior shot';
        textPart.text = `The user's prompt is: "${prompt}". You are creating a realistic architectural render. The first image is the architectural sketch. You MUST use the exact structure, form, and layout from this first sketch. The second image is a reference for style ONLY. You must apply the mood, lighting, and color palette from the second image to the ${subjectType} from the first sketch. It is forbidden to copy any shapes, objects, architectural elements, or scene composition (like window frames or foreground elements) from the second style-reference image. The final render must be an ${shotType} based on the user's prompt.`;
    } else {
        textPart.text = prompt;
    }

    parts.push(textPart);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      }
    );
    return extractBase64Image(response);
  });

  const results = await Promise.all(generationPromises);
  
  return results.filter((result): result is string => result !== null);
};


/**
 * Upscales an image to a target resolution using a descriptive prompt.
 * @param sourceImage - The source image object containing base64 data and mimeType.
 * @param target - The target resolution, either '2k' or '4k'.
 * @returns A promise that resolves to the base64 URL of the upscaled image.
 */
export const upscaleImage = async (
  sourceImage: SourceImage,
  target: '2k' | '4k'
): Promise<string | null> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }
  
  const prompt = `Upscale this image to ${target.toUpperCase()} resolution. Enhance details, sharpness, and clarity while preserving the original content, style, and composition. Make it photorealistic.`;

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: sourceImage.base64,
              mimeType: sourceImage.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    }
  );

  return extractBase64Image(response);
};

/**
 * Edits an image based on a source image, a mask, and a text prompt.
 * @param sourceImage - The original image to be edited.
 * @param maskImage - A black and white image where white indicates the area to edit.
 * @param prompt - The text prompt describing the desired edit.
 * @returns A promise that resolves to the base64 URL of the edited image.
 */
export const editImage = async (
  sourceImage: SourceImage,
  maskImage: SourceImage,
  prompt: string
): Promise<string | null> => {
  if (!API_KEY) {
    throw new Error("API_KEY is not configured.");
  }

  const engineeredPrompt = `You are an expert photo editor. You will receive an original image, a mask image, and a text prompt. Your task is to edit the original image *exclusively* within the white area defined by the mask. The black area of the mask represents the parts of the image that MUST remain completely untouched. The user's instruction for the edit is: "${prompt}". Whether this involves adding a new object, removing an existing one, or altering features, confine all changes strictly to the masked region. The final output should be a photorealistic image where the edits are seamlessly blended with the surrounding, unchanged areas.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: sourceImage.base64, mimeType: sourceImage.mimeType } },
        { inlineData: { data: maskImage.base64, mimeType: maskImage.mimeType } },
        { text: engineeredPrompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return extractBase64Image(response);
};

/**
 * Generates an image purely from a text prompt.
 * @param prompt - The text prompt to guide the image generation.
 * @returns A promise that resolves to a base64 image URL.
 */
export const generateImageFromText = async (prompt: string): Promise<string | null> => {
    if (!API_KEY) {
        throw new Error("API_KEY is not configured.");
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }

    return null;
};