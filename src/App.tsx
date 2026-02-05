import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroMetrics } from './components/HeroMetrics';
import { DataGrid } from './components/DataGrid';
import { FileUpload } from './components/FileUpload';
import { parseMediaPlan, parseAdTagFile } from './utils/fileParser';
import { validateAdTag } from './utils/validation';
import type { ParsedMediaPlan, ValidationResult, AdTag } from './types';
import { Loader2, RefreshCw, Download, AlertTriangle } from 'lucide-react';
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

  const UnmatchedDealsReport = () => {
    if (!mediaPlanData) return null;
    const unmatched = Object.values(mediaPlanData).filter(d => !matchedDeals.has(d.dealName));

    if (unmatched.length === 0) return null;

    return (
      <div className="bg-white rounded border border-status-warn-bg overflow-hidden mt-6">
        <div className="px-4 py-2 bg-status-warn-bg border-b border-status-warn-bg/50 flex items-center justify-between">
          <h3 className="font-bold text-status-warn-text text-sm flex items-center uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Missing Deals ({unmatched.length})
          </h3>
          <span className="text-[10px] text-gray-500 bg-white/50 px-2 py-0.5 rounded">Exists in Plan, No Matching Tag Found</span>
        </div>
        <div className="max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Deal Name</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Device Target</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unmatched.map((deal, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-900 font-medium">{deal.dealName}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{deal.deviceTargeted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-main font-sans text-gray-900">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 py-6">

        {/* Top Controls / Hero Metrics */}
        {validationResults.length > 0 ? (
          <HeroMetrics results={validationResults} fileCount={adTagFiles.length} />
        ) : (
          <div className="mb-6 p-4 bg-brand-navy/5 border border-brand-navy/10 rounded">
            <h2 className="text-lg font-bold text-brand-navy">Welcome to Validation Dashboard</h2>
            <p className="text-sm text-gray-600">Upload Media Plan and Ad Tags to begin analysis.</p>
          </div>
        )}

        {/* Input & Actions */}
        <section className="bg-white rounded border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Data Input</h3>
            <div className="flex gap-2">
              {mediaPlanFile && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              )}
              {validationResults.length > 0 && (
                <button
                  onClick={exportResults}
                  className="flex items-center gap-2 bg-brand-blue hover:bg-brand-navy text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors shadow-sm"
                >
                  <Download className="w-3 h-3" /> Export Report
                </button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">Media Plan</span>
                {mediaPlanData && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ {Object.keys(mediaPlanData).length} Deals</span>}
              </div>
              <FileUpload
                label=""
                accept=".xlsx,.xls,.csv"
                onChange={handleMediaPlanChange}
                fileCount={mediaPlanFile ? 1 : 0}
                icon="excel"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase">Ad Tags</span>
                {adTagFiles.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{adTagFiles.length} Files</span>}
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
            <div className="flex justify-center items-center py-20 bg-white rounded border border-gray-200">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
              <span className="ml-3 text-gray-500 font-medium">Processing validation...</span>
            </div>
          ) : validationResults.length > 0 ? (
            <>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Validation Matrix</h3>
                <span className="text-xs text-gray-400 font-mono">Showing {validationResults.length} rows</span>
              </div>
              <UnmatchedDealsReport />
              <DataGrid results={validationResults} />
            </>
          ) : null}
        </section>

      </main>
    </div>
  );
}

export default App;
