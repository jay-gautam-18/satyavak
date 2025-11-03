import React, { useState } from 'react';
import { generateDocument, translateText } from '../../services/geminiService';
import { LANGUAGE_MAP } from '../../constants';
import type { GeneratedDocument } from '../../types';
import { Spinner } from '../../components/Spinner';
import { DocumentIcon, FileTextIcon, CheckCircleIcon } from '../../components/Icons';

// The html-to-docx library is loaded via a script tag in index.html and attaches itself to the window object.

interface DocumentGeneratorProps {
    language: string;
    onSaveDocument: (doc: GeneratedDocument) => void;
}

const documentTypes: { [key: string]: { label: string; fields: { name: string; label: string; placeholder: string }[] } } = {
    'rental-agreement': {
        label: 'Rental Agreement',
        fields: [
            { name: 'landlordName', label: 'Landlord Full Name', placeholder: 'e.g., Ramesh Kumar' },
            { name: 'tenantName', label: 'Tenant Full Name', placeholder: 'e.g., Priya Singh' },
            { name: 'propertyAddress', label: 'Full Property Address', placeholder: 'e.g., 123, ABC Apartments, Sector 4, New Delhi' },
            { name: 'rentAmount', label: 'Monthly Rent (INR)', placeholder: 'e.g., 25000' },
            { name: 'securityDeposit', label: 'Security Deposit (INR)', placeholder: 'e.g., 50000' },
            { name: 'leaseTerm', label: 'Lease Term (in months)', placeholder: 'e.g., 11' },
            { name: 'startDate', label: 'Lease Start Date', placeholder: 'DD-MM-YYYY' },
        ],
    },
    'nda': {
        label: 'Non-Disclosure Agreement (NDA)',
        fields: [
            { name: 'disclosingParty', label: 'Disclosing Party', placeholder: 'e.g., Innovate Pvt. Ltd.' },
            { name: 'receivingParty', label: 'Receiving Party', placeholder: 'e.g., John Doe' },
            { name: 'effectiveDate', label: 'Effective Date', placeholder: 'DD-MM-YYYY' },
            { name: 'purpose', label: 'Purpose of Disclosure', placeholder: 'e.g., To evaluate a potential business relationship' },
            { name: 'term', label: 'Term of Agreement (in years)', placeholder: 'e.g., 3' },
        ],
    },
    'legal-notice': {
        label: 'Legal Notice',
        fields: [
            { name: 'senderName', label: 'Sender Full Name', placeholder: 'e.g., Vikram Singh' },
            { name: 'senderAddress', label: 'Sender Full Address', placeholder: 'e.g., 45, Civil Lines, Jaipur' },
            { name: 'recipientName', label: 'Recipient Full Name', placeholder: 'e.g., XYZ Corporation' },
            { name: 'recipientAddress', label: 'Recipient Full Address', placeholder: 'e.g., 789, Business Tower, Mumbai' },
            { name: 'subject', label: 'Subject of the Notice', placeholder: 'e.g., Regarding non-payment of dues' },
            { name: 'grievanceDetails', label: 'Detailed Grievance', placeholder: 'Describe the issue, dates, and amounts involved.' },
            { name: 'remedySought', label: 'Remedy/Action Required', placeholder: 'e.g., Payment of Rs. 50,000 within 15 days' },
        ],
    },
    'affidavit': {
        label: 'Affidavit',
        fields: [
            { name: 'deponentName', label: 'Deponent Full Name (Person making the statement)', placeholder: 'e.g., Gita Das' },
            { name: 'deponentAddress', label: 'Deponent Full Address', placeholder: 'e.g., 77, MG Road, Hyderabad' },
            { name: 'purpose', label: 'Purpose of the Affidavit', placeholder: 'e.g., For change of name in official documents' },
            { name: 'statement', label: 'Statement of Facts', placeholder: 'State the facts you are swearing to be true, in numbered paragraphs.' },
            { name: 'date', label: 'Date', placeholder: 'DD-MM-YYYY' },
            { name: 'place', label: 'Place', placeholder: 'e.g., Hyderabad' },
        ],
    },
    'will': {
        label: 'Will',
        fields: [
            { name: 'testatorName', label: 'Testator Full Name (Person making the will)', placeholder: 'e.g., Ashok Sharma' },
            { name: 'testatorAddress', label: 'Testator Full Address', placeholder: 'e.g., 12, Gandhi Marg, Pune' },
            { name: 'executorName', label: 'Executor Full Name', placeholder: 'e.g., Sunita Sharma' },
            { name: 'executorAddress', label: 'Executor Full Address', placeholder: 'e.g., 12, Gandhi Marg, Pune' },
            { name: 'beneficiaries', label: 'Beneficiaries & Assets', placeholder: 'e.g., "My daughter, Sunita Sharma, inherits my house. My son, Rahul Sharma, inherits my bank balance."' },
            { name: 'witness1Name', label: 'Witness 1 Full Name', placeholder: 'e.g., Rajesh Gupta' },
            { name: 'witness2Name', label: 'Witness 2 Full Name', placeholder: 'e.g., Meena Iyer' },
        ],
    },
    'power-of-attorney': {
        label: 'Power of Attorney',
        fields: [
            { name: 'principalName', label: 'Principal Full Name (Person giving power)', placeholder: 'e.g., Anil Mehta' },
            { name: 'principalAddress', label: 'Principal Full Address', placeholder: 'e.g., 34, Park Street, Kolkata' },
            { name: 'agentName', label: 'Agent Full Name (Person receiving power)', placeholder: 'e.g., Vijay Mehta' },
            { name: 'agentAddress', label: 'Agent Full Address', placeholder: 'e.g., 56, Lake View Road, Bengaluru' },
            { name: 'powersGranted', label: 'Specific Powers Granted', placeholder: 'e.g., To manage bank accounts, sell property at 34, Park Street, Kolkata.' },
            { name: 'effectiveDate', label: 'Effective Date', placeholder: 'DD-MM-YYYY' },
            { name: 'duration', label: 'Duration', placeholder: 'e.g., Until revoked by me in writing.' },
        ],
    },
};

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { number: 1, title: 'Select Type' },
        { number: 2, title: 'Add Details' },
        { number: 3, title: 'Download' }
    ];

    return (
        <nav className="flex items-center justify-center mb-8" aria-label="Progress">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= step.number ? 'bg-brand-accent text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                           {currentStep > step.number ? <CheckCircleIcon className="w-6 h-6" /> : step.number}
                        </div>
                        <p className={`mt-2 text-sm font-semibold ${currentStep >= step.number ? 'text-brand-dark dark:text-white' : 'text-slate-500'}`}>{step.title}</p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`flex-auto border-t-2 transition-colors mx-4 ${currentStep > index + 1 ? 'border-brand-accent' : 'border-slate-200 dark:border-slate-700'}`}></div>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ language, onSaveDocument }) => {
    const [step, setStep] = useState(1);
    const [docTypeKey, setDocTypeKey] = useState('');
    const [details, setDetails] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [generatedDoc, setGeneratedDoc] = useState('');
    const [error, setError] = useState('');

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setGeneratedDoc('');
        setError('');
        
        try {
            const docLabel = documentTypes[docTypeKey].label;
            const englishDocType = language === 'English' ? docLabel : await translateText(docLabel, 'English');
            
            const englishDetails: Record<string, string> = {};
            for (const key in details) {
                englishDetails[key] = language === 'English' ? details[key] : await translateText(details[key], 'English');
            }

            const response = await generateDocument(englishDocType, englishDetails);
            const englishDocHtml = response.text.replace(/```html\n?/, '').replace(/```$/, '');
            
            const translatedDoc = language === 'English' ? englishDocHtml : await translateText(englishDocHtml, LANGUAGE_MAP[language]);
            setGeneratedDoc(translatedDoc);

            const newDocument: GeneratedDocument = {
                id: Date.now().toString(),
                docType: docLabel,
                createdAt: new Date().toISOString(),
                content: translatedDoc,
            };
            onSaveDocument(newDocument);
            setStep(3);

        } catch (err) {
            console.error("Error generating document:", err);
            setError("Failed to generate document. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = async () => {
        try {
            const fileBuffer = await (window as any).htmlToDocx(generatedDoc, null, {
                footer: true,
                pageNumber: true,
            });
            const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${documentTypes[docTypeKey].label.replace(/\s/g, '_')}_${Date.now()}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Error creating .docx file:", e);
            alert("Could not create .docx file. An error occurred.");
        }
    };

    const startOver = () => {
        setStep(1);
        setDocTypeKey('');
        setDetails({});
        setGeneratedDoc('');
        setError('');
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-brand-dark dark:text-white">Select Document Type</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Choose the type of legal document you need to create.</p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(documentTypes).map(([key, { label }]) => (
                                <button 
                                  key={key} 
                                  onClick={() => { setDocTypeKey(key); setDetails({}); setStep(2); }}
                                  className={`p-4 text-center rounded-lg border-2 transition-colors ${docTypeKey === key ? 'border-brand-accent bg-brand-accent/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-medium hover:border-brand-accent/50'}`}
                                >
                                    <FileTextIcon className="w-8 h-8 mx-auto text-brand-accent mb-2" />
                                    <p className="font-semibold text-brand-dark dark:text-white text-sm">{label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                const selectedDoc = documentTypes[docTypeKey];
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-brand-dark dark:text-white mb-4">Fill in Details for: <span className="text-brand-accent">{selectedDoc.label}</span></h3>
                        <div className="space-y-4">
                            {selectedDoc.fields.map(field => (
                                <div key={field.name}>
                                    <label htmlFor={field.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                                    <input id={field.name} name={field.name} value={details[field.name] || ''} onChange={handleDetailChange} type="text" placeholder={field.placeholder} className="block w-full p-2.5 border border-slate-300 rounded-lg shadow-subtle focus:ring-brand-accent focus:border-brand-accent dark:bg-slate-800 dark:text-white dark:border-slate-600"/>
                                </div>
                            ))}
                        </div>
                         <div className="flex gap-4 mt-6">
                            <button onClick={() => setStep(1)} className="w-1/2 bg-slate-200 dark:bg-slate-600 text-brand-dark dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors">
                                Back
                            </button>
                            <button onClick={handleGenerate} disabled={isLoading} className="w-1/2 bg-brand-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-accent-dark disabled:bg-slate-400 flex items-center justify-center transition-colors">
                                {isLoading ? <Spinner/> : 'Generate Document'}
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                     <div>
                        <h3 className="text-2xl font-semibold text-brand-dark dark:text-white mb-4">Your <span className="text-brand-accent">{documentTypes[docTypeKey].label}</span> is Ready</h3>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: generatedDoc }} />
                        <div className="flex gap-4 mt-6">
                            <button onClick={startOver} className="w-1/2 bg-slate-200 dark:bg-slate-600 text-brand-dark dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors">
                                Generate Another
                            </button>
                            <button onClick={handleDownload} className="w-1/2 bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 transition-colors">
                                <DocumentIcon className="w-5 h-5"/> Download as .docx
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">Disclaimer: This is an AI-generated draft for informational purposes only and should be reviewed by a qualified legal professional. Your document has been saved to your profile.</p>
                    </div>
                )
            default:
                return null;
        }
    }
    
    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Document Generator</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Create professional legal documents in a few simple steps.</p>
            <div className="bg-white dark:bg-brand-medium p-6 md:p-8 rounded-xl shadow-card">
                <StepIndicator currentStep={step} />
                <div className="mt-8">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};