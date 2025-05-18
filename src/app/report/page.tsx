'use client'
import { useEffect, useState, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Calendar, Shield, AlertTriangle, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface CodeProps extends React.ClassAttributes<HTMLElement>, React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  node?: any;
}

export default function AIReportPage() {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [downloadReady, setDownloadReady] = useState(false)
  const reportContainerRef = useRef<HTMLDivElement>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [footerTimestamp, setFooterTimestamp] = useState('')
  
  // Add this effect to set the date/time values once the component is mounted on the client
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString())
    setCurrentTime(new Date().toLocaleTimeString())
    setFooterTimestamp(new Date().toLocaleString())
  }, [])

  // Step 1: Fetch report (POST with dummy payload)
  useEffect(() => {
    const fetchReport = async () => {
      try {
        // Start progress
        setProgress(10)
        
        const res = await fetch('/api/incident-digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary_stats: {
              total_requests: 10000,
              total_alerts: 218,
              error_bursts: 34,
              ip_spikes: 91,
              behavioral_deviations: 93,
            },
            top_offenders: [
              { ip: '20.171.207.17', flags: [1, 3], request_count: 382 },
              { ip: '84.203.1.217', flags: [2], request_count: 244 },
            ],
            notable_alerts: [
              {
                type: 'IP Spike',
                ip: '84.203.1.217',
                time: '05:13–05:20',
                path: '/wp-cron.php',
                explanation:
                  'Automated WordPress cron jobs triggered excessive traffic.',
              },
              {
                type: 'Error Burst',
                ip: '196.251.88.242',
                time: '08:49–08:50',
                path: '/wp-content/themes/about.php',
                status: 403,
                explanation:
                  'Bot likely probing for vulnerable themes.',
              },
            ],
          }),
        })

        setProgress(70)
        
        const { incidentReport } = await res.json()
        setReport(incidentReport)
        setLoading(false)
        setProgress(100)
      } catch (error) {
        console.error('Error generating report:', error)
        setLoading(false)
      }
    }

    fetchReport()
  }, [])

  // Replace your current generatePDF function with this one

  const generatePDF = async () => {
    if (!report) return
    
    setIsPdfGenerating(true)
    setDownloadReady(false)
    
    try {
      // Dynamically import jspdf
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default
      
      // Create the PDF with text directly (no HTML/CSS rendering)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // PDF dimensions - adjusted margins for better readability
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2) // Available width for content
      
      // Add fancy header in blue
      pdf.setFillColor(37, 99, 235) // blue-600
      pdf.rect(0, 0, pageWidth, 25, 'F')
      
      // Add title
      pdf.setTextColor(255, 255, 255)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(16)
      pdf.text('AI-Generated Incident Report', margin, 15)
      
      // Add timestamp
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(`Generated: ${currentDate} at ${currentTime}`, margin, 35)
      
      // Add report content line by line (direct text approach)
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(29, 78, 216) // blue-700
      pdf.text("Security Incident Report", margin, 45)
      
      // Parse the markdown into plain text sections
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      
      // Helper to split text into lines that fit in the PDF with improved parameters
      const splitTextToLines = (text: string, fontSize: number, width: number = contentWidth) => {
        pdf.setFontSize(fontSize)
        return pdf.splitTextToSize(text, width)
      }
      
      // Helper function to parse markdown formatting
      const parseMarkdownText = (text: string) => {
        // Replace emoji placeholders with simplified text representations
        text = text.replace(/📊/g, "(Chart) ")
            .replace(/🚨/g, "(Alert) ")
            .replace(/🔍/g, "(Search) ")
            .replace(/🛡️/g, "(Shield) ")
            .replace(/🛡/g, "(Shield) ");
        
        return text;
      }
      
      // Format the report into sections
      const lines = report.split("\n")
      let y = 55
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Skip empty lines
        if (!line) continue
        
        // Handle headings (lines starting with #)
        if (line.startsWith('# ')) {
          if (y > 270) { pdf.addPage(); y = 20; } // Add page if needed
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(14)
          pdf.setTextColor(29, 78, 216) // blue-700
          pdf.text(parseMarkdownText(line.replace('# ', '')), margin, y)
          y += 8
        } 
        // Handle subheadings (lines starting with ##)
        else if (line.startsWith('## ')) {
          if (y > 270) { pdf.addPage(); y = 20; } // Add page if needed
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(13)
          pdf.setTextColor(67, 56, 202) // indigo-700
          pdf.text(parseMarkdownText(line.replace('## ', '')), margin, y)
          y += 7
        }
        // Handle list items with bold sections
        else if (line.startsWith('- ')) {
          if (y > 270) { pdf.addPage(); y = 20; } // Add page if needed
          
          // Extract the text without the "- " prefix
          const itemText = line.substring(2);
          
          // Check if the line contains bold text
          if (itemText.includes('**')) {
            // Format the text with bold formatting
            const parts = itemText.split(/(\*\*.*?\*\*)/g);
            
            let xOffset = margin;
            const bulletWidth = 3;
            const indentWidth = 14; // Width for bullet plus spacing
            
            // Add the bullet point
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(11)
            pdf.setTextColor(31, 41, 55) // gray-800
            pdf.text('•', margin, y)
            xOffset += bulletWidth + 2;
            
            // Process each part, toggling bold as needed
            let textParts = [];
            for (let part of parts) {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                const text = part.replace(/\*\*/g, '');
                textParts.push({ text, isBold: true });
              } else if (part.trim() !== '') {
                // Normal text
                textParts.push({ text: parseMarkdownText(part), isBold: false });
              }
            }
            
            // Combine all the text to get the full line
            const fullText = textParts.map(p => p.text).join('');
            
            // Split the full text to ensure it fits
            const wrappedText = splitTextToLines(fullText, 11, contentWidth - indentWidth);
            
            // First line with bullet point
            pdf.text(wrappedText[0], margin + indentWidth, y);
            
            // Additional wrapped lines with proper indentation
            for (let l = 1; l < wrappedText.length; l++) {
              y += 6;
              pdf.text(wrappedText[l], margin + indentWidth, y);
            }
            
            y += 6; // Add space after bullet point
          } else {
            // Simple bullet point without bold text
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(11)
            pdf.setTextColor(31, 41, 55) // gray-800
            
            const bulletText = parseMarkdownText(itemText);
            const wrappedText = splitTextToLines(bulletText, 11, contentWidth - 14);
            
            // Add all lines of wrapped text with proper indentation
            pdf.text('•', margin, y); // Bullet point
            pdf.text(wrappedText[0], margin + 14, y); // First line
            
            // Remaining lines with proper indentation
            for (let l = 1; l < wrappedText.length; l++) {
              y += 6;
              pdf.text(wrappedText[l], margin + 14, y);
            }
            
            y += 6; // Add space after bullet point
          }
        }
        // Regular paragraphs
        else {
          if (y > 270) { pdf.addPage(); y = 20; } // Add page if needed
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(11)
          pdf.setTextColor(31, 41, 55) // gray-800
          
          const wrappedText = splitTextToLines(parseMarkdownText(line), 11)
          wrappedText.forEach((textLine: string, index: number) => {
            pdf.text(textLine, margin, y)
            y += 6
          })
        }
        
        // Add extra spacing between sections
        if (line.startsWith('#')) {
          y += 2
        }
      }
      
      // Add footer
      const pageCount = pdf.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(9)
        pdf.setTextColor(107, 114, 128) // gray-500
        pdf.text(`Security Analysis - Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' })
      }
      
      // Save the PDF
      pdf.save('incident-report.pdf')
      
      setDownloadReady(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  // Custom styled components for markdown with proper types
  const markdownComponents: Components = {
    h1: ({children, ...props}) => (
      <h1 className="text-xl font-bold my-6 pb-2 border-b border-gray-300 dark:border-gray-700 text-indigo-700 dark:text-indigo-400" {...props}>
        {children}
      </h1>
    ),
    h2: ({children, ...props}) => (
      <h2 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400" {...props}>
        {children}
      </h2>
    ),
    h3: ({children, ...props}) => (
      <h3 className="text-md font-medium mt-4 mb-2 text-gray-800 dark:text-gray-200" {...props}>
        {children}
      </h3>
    ),
    ul: ({children, ...props}) => (
      <ul className="list-disc pl-6 my-3 space-y-1" {...props}>
        {children}
      </ul>
    ),
    li: ({children, ...props}) => (
      <li className="mb-1.5" {...props}>
        {children}
      </li>
    ),
    strong: ({children, ...props}) => (
      <strong className="font-bold text-blue-700 dark:text-blue-300" {...props}>
        {children}
      </strong>
    ),
    p: ({children, ...props}) => (
      <p className="my-2.5 text-gray-700 dark:text-gray-300" {...props}>
        {children}
      </p>
    ),
    // Add custom element for code blocks
    code: ({node, inline, className, children, ...props}: CodeProps) => (
      <code 
        className={`${className || ''} ${inline ? 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm' : 
          'block bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-auto'}`}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto text-sm text-zinc-900 dark:text-zinc-100">
      <div className="mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-2 text-blue-700 dark:text-blue-400">
          AI-Generated Incident Report
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Generated on {currentDate} at {currentTime}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4 p-8 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="font-medium">Generating AI security analysis...</p>
          </div>
          <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-800" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {progress < 50 ? "Analyzing security patterns..." : "Compiling insights and recommendations..."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-500" />
            <p className="text-green-700 dark:text-green-400">Report generated successfully</p>
          </div>
          
          <Button 
            onClick={generatePDF} 
            disabled={isPdfGenerating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            {isPdfGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF Report
              </>
            )}
          </Button>
          
          {downloadReady && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mt-2">
              <Shield className="h-4 w-4" />
              <p>PDF downloaded successfully</p>
            </div>
          )}
        </div>
      )}

<div 
  id="report-container" 
  ref={reportContainerRef} 
  className="mt-8 leading-relaxed border-0 rounded-lg shadow-lg font-sans relative overflow-hidden"
>
  {report && (
    <>
      {/* Left accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
      
      {/* Top design element */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold mb-1">Security Incident Report</h2>
            <p className="text-blue-100 text-sm">NGINX Server Anomaly Analysis</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-md">
            <Shield className="h-6 w-6 text-blue-200" />
          </div>
        </div>
      </div>
      
      {/* Main content with improved styling */}
      <div className="p-6 bg-white text-black">
        <ReactMarkdown
          components={{
            ...markdownComponents,
            // Override some components to make them darker
                h1: ({children, ...props}) => (
                  <h1 className="text-xl font-bold my-6 pb-2 border-b border-gray-300 text-blue-800" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({children, ...props}) => (
                  <h2 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2 text-indigo-700" {...props}>
                    {/* Add icon based on content */}
                    {String(children).includes("Summary") && <AlertTriangle className="h-5 w-5" />}
                    {String(children).includes("IP") && <ArrowRight className="h-5 w-5" />}
                    {String(children).includes("Incidents") && <AlertTriangle className="h-5 w-5" />}
                    {String(children).includes("Recommendations") && <Shield className="h-5 w-5" />}
                    {children}
                  </h2>
                ),
                strong: ({children, ...props}) => (
                  <strong className="font-bold text-blue-800" {...props}>
                    {children}
                  </strong>
                ),
                p: ({children, ...props}) => (
                  <p className="my-2.5 text-gray-800" {...props}>
                    {children}
                  </p>
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {report}
            </ReactMarkdown>
          </div>
      
          {/* Footer with improved design */}
          <div className="bg-gray-100 p-5 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">Generated by AI Security Analyst - MING</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{footerTimestamp}</span>
            </div>
          </div>
        </>
        )}
      </div>
    </div>
  )
}