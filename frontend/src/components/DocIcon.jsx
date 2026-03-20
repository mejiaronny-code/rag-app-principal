import { FileText, FileImage, Globe, File, BookOpen, Sheet } from 'lucide-react'

export function DocIcon({ type, className = 'w-4 h-4' }) {
  const icons = {
    pdf: <FileText className={className} />,
    docx: <BookOpen className={className} />,
    doc: <BookOpen className={className} />,
    txt: <FileText className={className} />,
    md: <FileText className={className} />,
    markdown: <FileText className={className} />,
    image: <FileImage className={className} />,
    jpg: <FileImage className={className} />,
    jpeg: <FileImage className={className} />,
    png: <FileImage className={className} />,
    url: <Globe className={className} />,
    xlsx: <Sheet className={className} />,  // ← nuevo
    xls: <Sheet className={className} />,   // ← nuevo
  }
  return icons[type] || <File className={className} />
}
