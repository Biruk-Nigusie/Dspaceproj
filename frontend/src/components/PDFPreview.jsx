import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PdfPreview = ({ fileUrl }) => {
	const [numPages, setNumPages] = useState(0);

	const onDocumentLoadSuccess = ({ numPages }) => {
		setNumPages(numPages);
	};

	return (
		<div className="overflow-auto h-full p-4 bg-background">
			<Document
				file={fileUrl}
				onLoadSuccess={onDocumentLoadSuccess}
				onLoadError={(error) => console.error("PDF Load Error:", error)}
				loading={
					<div className="text-center text-muted-foreground">
						Loading PDF...
					</div>
				}
			>
				{Array.from({ length: numPages }, (_, index) => (
					<Page
						key={`page_${index + 1}`}
						pageNumber={index + 1}
						width={600}
						renderAnnotationLayer
						renderTextLayer
					/>
				))}
			</Document>
		</div>
	);
};
