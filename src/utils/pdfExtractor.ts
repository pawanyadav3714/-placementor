function loadPdfJs(): Promise<any> {
    return new Promise((resolve, reject) => {
        if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
        }

        // Avoid multiple scripts being added if clicked multiple times quickly
        const existingScript = document.getElementById('pdfjs-cdn-script');
        if (existingScript) {
            const interval = setInterval(() => {
                if ((window as any).pdfjsLib) {
                    clearInterval(interval);
                    resolve((window as any).pdfjsLib);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = 'pdfjs-cdn-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            const pdfjs = (window as any).pdfjsLib;
            if (pdfjs) {
                pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(pdfjs);
            } else {
                reject(new Error('pdfjsLib not found on window after script load'));
            }
        };
        script.onerror = () => {
            reject(new Error('Failed to load PDF.js script from CDN'));
        };
        document.head.appendChild(script);
    });
}

export async function extractTextFromPDF(file: File): Promise<string> {
    const pdfjsLib = await loadPdfJs();

    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                
                let extractedText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    extractedText += pageText + '\n';
                }

                resolve(extractedText);
            } catch (error: any) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error("Error extracting text from PDF:", errMsg);
                reject(new Error(errMsg));
            }
        };

        fileReader.onerror = function() {
            const errMsg = fileReader.error ? fileReader.error.message : "File read error";
            reject(new Error(errMsg));
        };

        fileReader.readAsArrayBuffer(file);
    });
}

export async function extractTextPagesFromPDF(file: File): Promise<string[]> {
    const pdfjsLib = await loadPdfJs();

    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                
                const pages: string[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    pages.push(pageText);
                }

                resolve(pages);
            } catch (error: any) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error("Error extracting text pages from PDF:", errMsg);
                reject(new Error(errMsg));
            }
        };

        fileReader.onerror = function() {
            const errMsg = fileReader.error ? fileReader.error.message : "File read error";
            reject(new Error(errMsg));
        };

        fileReader.readAsArrayBuffer(file);
    });
}

export async function extractImagesFromPDF(file: File): Promise<string[]> {
    const pdfjsLib = await loadPdfJs();

    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                
                const pageImages: string[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d');
                    if (context) {
                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        pageImages.push(dataUrl);
                    }
                }

                resolve(pageImages);
            } catch (error: any) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error("Error rendering PDF pages as images:", errMsg);
                reject(new Error(errMsg));
            }
        };

        fileReader.onerror = function() {
            const errMsg = fileReader.error ? fileReader.error.message : "File read error";
            reject(new Error(errMsg));
        };

        fileReader.readAsArrayBuffer(file);
    });
}

