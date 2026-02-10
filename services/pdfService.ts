
const getPdfLib = () => {
  // @ts-ignore
  const lib = window.pdfjsLib;
  if (!lib) {
    throw new Error("PDF.js library not loaded yet.");
  }
  return lib;
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const pdfjsLib = getPdfLib();
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
};

export const extractTextFromTxt = async (file: File): Promise<string> => {
  return await file.text();
};
