import React, { useState } from 'react';
import { Header } from './components/Header';
import { DataGrid } from './components/DataGrid';
import { FileUpload } from './components/FileUpload';
import { DealQA } from './components/DealQA';
import { parseMediaPlan, parseAdTagFile } from './utils/fileParser';
import { validateAdTag } from './utils/validation';
import type { ParsedMediaPlan, ValidationResult, AdTag } from './types';
import { Loader2, RefreshCw, Download, Zap, FileSearch } from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [mediaPlanFile, setMediaPlanFile] = useState<File | null>(null);
  const [mediaPlanData, setMediaPlanData] = useState<ParsedMediaPlan | null>(null);
  const [adTagFiles, setAdTagFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedDeals, setMatchedDeals] = useState<Set<string>>(new Set());

  // Handle Media Plan Upload
  const handleMediaPlanChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaPlanFile(file);
      setIsProcessing(true);
      try {
        const data = await parseMediaPlan(file);
        setMediaPlanData(data);
        if (adTagFiles.length > 0) {
          await runValidation(adTagFiles, data);
        }
      } catch (err) {
        console.error("Error parsing media plan", err);
        alert("Failed to parse Media Plan. Please check the file format.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle Ad Tag Files Upload
  const handleAdTagsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAdTagFiles(prev => [...prev, ...newFiles]);

      const allFiles = [...adTagFiles, ...newFiles];
      if (mediaPlanData) {
        await runValidation(allFiles, mediaPlanData);
      }
    }
  };

  const runValidation = async (files: File[], plan: ParsedMediaPlan) => {
    setIsProcessing(true);
    const results: ValidationResult[] = [];
    const matched = new Set<string>();

    // Process all files
    for (const file of files) {
      try {
        const parsedTags: AdTag[] = await parseAdTagFile(file);

        parsedTags.forEach(tag => {
          const result = validateAdTag(tag, plan);
          results.push(result);
          if (result.dealMatchStatus === 'Found') {
            matched.add(result.dealName);
          }
        });

      } catch (err) {
        console.error("Error parsing tag file", file.name, err);
      }
    }

    // Mark duplicate tag names (Rule 2)
    const tagNameCounts = new Map<string, number>();
    results.forEach(r => tagNameCounts.set(r.tagName, (tagNameCounts.get(r.tagName) || 0) + 1));
    results.forEach(r => { if ((tagNameCounts.get(r.tagName) || 0) > 1) r.isDuplicateTagName = true; });

    setValidationResults(results);
    setMatchedDeals(matched);
    setIsProcessing(false);
  };

  const clearAll = () => {
    setMediaPlanFile(null);
    setMediaPlanData(null);
    setAdTagFiles([]);
    setValidationResults([]);
    setMatchedDeals(new Set());
  };

  const exportResults = () => {
    if (validationResults.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(validationResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validation Results");

    if (mediaPlanData) {
      const unmatched = Object.values(mediaPlanData).filter(d => !matchedDeals.has(d.dealName));
      const wsMissing = XLSX.utils.json_to_sheet(unmatched);
      XLSX.utils.book_append_sheet(wb, wsMissing, "Missing Deals");
    }

    XLSX.writeFile(wb, "Ad_Tag_Validation_Report.xlsx");
  };


  /* Tab State */
  const [activeTab, setActiveTab] = useState<'validator' | 'dealqa'>('validator');

  return (
    <div className="min-h-screen bg-bg-main font-sans text-gray-900">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Navigation Tabs - Modern pill style */}
        <div className="flex items-center gap-1 mb-8 bg-white/60 backdrop-blur-sm p-1.5 rounded-xl w-fit shadow-sm border border-gray-200/60">
          <button
            onClick={() => setActiveTab('validator')}
            className={`flex items-center gap-2 py-2.5 px-5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'validator'
              ? 'bg-brand-navy text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/80'
              }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Ad Tag Validation
          </button>
          <button
            onClick={() => setActiveTab('dealqa')}
            className={`flex items-center gap-2 py-2.5 px-5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'dealqa'
              ? 'bg-brand-navy text-white shadow-md'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/80'
              }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            Deal QA
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'validator' ? (
          <div className="animate-fade-in">
            {/* Input & Actions */}
            <section className="bg-white rounded-xl border border-gray-200/80 p-5 mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Data Input</h3>
                <div className="flex gap-2">
                  {mediaPlanFile && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  )}
                  {validationResults.length > 0 && (
                    <button
                      onClick={exportResults}
                      className="flex items-center gap-2 bg-gradient-to-r from-brand-blue to-brand-navy hover:shadow-lg text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                      <Download className="w-3 h-3" /> Export Report
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/60">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Media Plan</span>
                    {mediaPlanData && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{Object.keys(mediaPlanData).length} Deals</span>}
                  </div>
                  <FileUpload
                    label=""
                    accept=".xlsx,.xls,.csv"
                    onChange={handleMediaPlanChange}
                    fileCount={mediaPlanFile ? 1 : 0}
                    icon="excel"
                  />
                </div>

                <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/60">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Ad Tags</span>
                    {adTagFiles.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{adTagFiles.length} Files</span>}
                  </div>
                  <FileUpload
                    label=""
                    accept=".txt"
                    onChange={handleAdTagsChange}
                    fileCount={adTagFiles.length}
                    icon="text"
                    multiple={true}
                  />
                </div>
              </div>
            </section>

            {/* Main Data Grid */}
            <section>
              {isProcessing ? (
                <div className="flex flex-col justify-center items-center py-20 bg-white rounded-xl border border-gray-200/80 shadow-sm">
                  <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
                  <span className="mt-4 text-gray-500 font-medium">Processing validation...</span>
                  <div className="mt-3 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue rounded-full shimmer" style={{ width: '60%' }} />
                  </div>
                </div>
              ) : validationResults.length > 0 ? (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Validation Matrix</h3>
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2.5 py-1 rounded-full">{validationResults.length} rows</span>
                  </div>
                  <DataGrid results={validationResults} mediaPlanData={mediaPlanData} />
                </div>
              ) : null}
            </section>
          </div>
        ) : (
          <div className="animate-fade-in">
            <DealQA />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
