import { useState, useEffect, useRef } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { toast } from 'sonner';
import { 
  FileEdit, Mic, MicOff, Volume2, Radio, RotateCcw, Download, Megaphone, Users, CheckCircle2, 
  AlertTriangle, Sparkles, Search, FileText, Clock, Loader2, 
  Copy, BookOpen, ChevronDown, ChevronUp, X, CheckSquare, 
  FileCheck, Upload, ExternalLink, UserCheck, Plus, Filter, ShieldCheck, Eye,
  ShieldAlert, Info, PackageCheck, Building2, Pause, Play, Paperclip, Camera, Image as ImageIcon
} from 'lucide-react';
import useLiveTranscriber from '../../hooks/useLiveTranscriber';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { 
  calculateMeetingQuorum, 
  generatePreMeetingAgenda, 
  querySecretaryKnowledgeBase, 
  fetchActiveResolutions,
  createResolution,
  updateResolutionStatus,
  extractResolutionsFromMinutes,
  evaluateConstitutionalCompliance,
  generateHandoverPackage,
  extractTextFromDocumentImage,
  AgendaItem, 
  QuorumStatus, 
  KnowledgeQueryResult,
  Resolution,
  ConstitutionalCheckResult,
  HandoverPackage
} from '../../utils/aiService';

export const SecretaryDashboard = () => {
  // Lock Engine States
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('general_secretary_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Configuration States (Inside Update Profile Photo Modal)
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  // Live Dynamic Stats States
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [announcementsCount, setAnnouncementsCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // 1. Fetch total registered members from public.members
        const { count: totalMembers, error: memberErr } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true });

        if (!memberErr && totalMembers !== null) {
          setMemberCount(totalMembers);
        }

        // 2. Fetch total published announcements
        const { count: totalAnnouncements, error: annErr } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true });

        if (!annErr && totalAnnouncements !== null) {
          setAnnouncementsCount(totalAnnouncements);
        }
      } catch (err) {
        console.error('Error fetching secretary dashboard metrics:', err);
      }
    };

    fetchDashboardStats();
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [minutesText, setMinutesText] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const { 
    currentUser, 
    members, 
    setMembers, 
    setCurrentUser, 
    announcements, 
    setAnnouncements, 
    setSuccess, 
    setError,
    isFloorActive,
    activeSpeaker,
    speakQueue,
    liveTranscriptListener,
    toggleFloor,
    grantFloor,
    revokeFloor
  } = useApp();

  const lastProcessedTranscriptTimestampRef = useRef<number>(0);

  // Auto-append floor speaker transcribed chunks to minutes editor
  useEffect(() => {
    if (
      liveTranscriptListener &&
      liveTranscriptListener.timestamp > lastProcessedTranscriptTimestampRef.current &&
      liveTranscriptListener.text
    ) {
      lastProcessedTranscriptTimestampRef.current = liveTranscriptListener.timestamp;
      setMinutesText((prev) => 
        prev 
          ? `${prev}\n\n[🎤 ${liveTranscriptListener.speakerName}]:\n${liveTranscriptListener.text}` 
          : `[🎤 ${liveTranscriptListener.speakerName}]:\n${liveTranscriptListener.text}`
      );
    }
  }, [liveTranscriptListener]);

  // Attachment Drawer & Vision OCR States & Input Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isExtractingDocument, setIsExtractingDocument] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAttachmentMenuOpen(false);
    setIsExtractingDocument(true);
    const toastId = toast.loading('AI is transcribing & translating document...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const extractedText = await extractTextFromDocumentImage(base64Data, file.type);
          
          setMinutesText((prev) => 
            prev ? `${prev}\n\n[Extracted Document Note]:\n${extractedText}` : `[Extracted Document Note]:\n${extractedText}`
          );
          
          toast.success('Document transcribed and appended to live minutes!', { id: toastId });
        } catch (err: any) {
          toast.error(err?.message || 'Failed to extract text from document.', { id: toastId });
        } finally {
          setIsExtractingDocument(false);
          if (event.target) event.target.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file.', { id: toastId });
        setIsExtractingDocument(false);
        if (event.target) event.target.value = '';
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err?.message || 'Error processing document.', { id: toastId });
      setIsExtractingDocument(false);
      if (event.target) event.target.value = '';
    }
  };

  // Real-Time Speech Listener Hook Integration (Phase 2 & 3)
  const {
    status: transcriberStatus,
    isListening,
    transcript: liveTranscript,
    interimTranscript,
    error: transcriberError,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript
  } = useLiveTranscriber((liveText) => {
    if (liveText !== undefined) {
      setMinutesText(liveText);
    }
  });

  // Phase 1 Pre-Meeting & Quorum States
  const [presentMembersCount, setPresentMembersCount] = useState<number>(42);
  const [quorumStatus, setQuorumStatus] = useState<QuorumStatus | null>(null);
  const [isCalculatingQuorum, setIsCalculatingQuorum] = useState<boolean>(false);

  // Phase 1 Agenda Generator States
  const [agendaItems, setAgendaItems] = useState<AgendaItem[] | null>(null);
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState<boolean>(false);
  const [isAgendaDrawerOpen, setIsAgendaDrawerOpen] = useState<boolean>(true);

  // Phase 1 Knowledge Base RAG Search States
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState<string>('');
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState<boolean>(false);
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeQueryResult | null>(null);
  const [isKnowledgeDrawerOpen, setIsKnowledgeDrawerOpen] = useState<boolean>(false);

  // Phase 2 Resolution & Task Lifecycle States
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isLoadingResolutions, setIsLoadingResolutions] = useState<boolean>(false);
  const [resolutionFilter, setResolutionFilter] = useState<string>('ALL');

  // Extracted Motions Modal States
  const [extractedMotions, setExtractedMotions] = useState<Array<Omit<Resolution, 'id'>> | null>(null);
  const [isExtractingMotions, setIsExtractingMotions] = useState<boolean>(false);
  const [isExtractedModalOpen, setIsExtractedModalOpen] = useState<boolean>(false);
  const [isSavingExtracted, setIsSavingExtracted] = useState<boolean>(false);

  // Action Closure & Evidence Modal States
  const [closureResolution, setClosureResolution] = useState<Resolution | null>(null);
  const [evidenceUrlInput, setEvidenceUrlInput] = useState<string>('');
  const [evidenceNotesInput, setEvidenceNotesInput] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Manual Create Resolution Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newResTitle, setNewResTitle] = useState<string>('');
  const [newResDesc, setNewResDesc] = useState<string>('');
  const [newResMover, setNewResMover] = useState<string>('');
  const [newResSeconder, setNewResSeconder] = useState<string>('');
  const [newResVoteType, setNewResVoteType] = useState<Resolution['vote_type']>('Voice Vote');
  const [newResOfficerId, setNewResOfficerId] = useState<string>('GEN-SEC-2026');
  const [newResOfficerName, setNewResOfficerName] = useState<string>('General Secretary');
  const [newResDeadline, setNewResDeadline] = useState<string>('');
  const [isCreatingResolution, setIsCreatingResolution] = useState<boolean>(false);

  // Phase 3 Constitutional Audit & Governance States
  const [complianceResult, setComplianceResult] = useState<ConstitutionalCheckResult | null>(null);
  const [isAuditingCompliance, setIsAuditingCompliance] = useState<boolean>(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState<boolean>(false);

  // Phase 3 Executive Handover Package States
  const [handoverDossier, setHandoverDossier] = useState<HandoverPackage | null>(null);
  const [isGeneratingHandover, setIsGeneratingHandover] = useState<boolean>(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);

  // Phase 3 Post-Stream Multi-Agent Pipeline States
  const [isPostProcessing, setIsPostProcessing] = useState<boolean>(false);
  const [postStreamBannerInfo, setPostStreamBannerInfo] = useState<{
    show: boolean;
    standardizedNamesCount: number;
    extractedMotionsCount: number;
  } | null>(null);
  const [isRosterVerified, setIsRosterVerified] = useState<boolean>(false);

  // Saved Minutes State
  const [savedMinutes, setSavedMinutes] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('cmo_meeting_minutes');
    if (stored) {
      try {
        setSavedMinutes(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse meeting minutes', e);
      }
    } else {
      const mock = [
        { id: 'MIN-001', date: '2026-06-10', title: 'Monthly General Assembly Meeting', author: 'Eze, Chukwuma' },
        { id: 'MIN-002', date: '2026-07-08', title: 'Executive Council Review Session', author: 'Eze, Chukwuma' }
      ];
      setSavedMinutes(mock);
      localStorage.setItem('cmo_meeting_minutes', JSON.stringify(mock));
    }
  }, []);

  // Fetch quorum status whenever presentMembersCount changes
  useEffect(() => {
    let isMounted = true;
    const loadQuorum = async () => {
      setIsCalculatingQuorum(true);
      try {
        const status = await calculateMeetingQuorum(presentMembersCount);
        if (isMounted) setQuorumStatus(status);
      } catch (err) {
        console.error('Failed to calculate quorum:', err);
      } finally {
        if (isMounted) setIsCalculatingQuorum(false);
      }
    };
    loadQuorum();
    return () => { isMounted = false; };
  }, [presentMembersCount]);

  const handleGenerateAgenda = async () => {
    setIsGeneratingAgenda(true);
    try {
      const items = await generatePreMeetingAgenda(['Resolution on Annual Dues Audit', 'Welfare Disbursement Review']);
      setAgendaItems(items);
      setIsAgendaDrawerOpen(true);
      setSuccess('AI Pre-Meeting Agenda generated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error generating agenda:', err);
      setError('Failed to generate pre-meeting agenda.');
    } finally {
      setIsGeneratingAgenda(false);
    }
  };

  const handleInsertAgendaToMinutes = () => {
    if (!agendaItems || agendaItems.length === 0) return;

    const formattedAgendaText = `
========================================
PRE-MEETING CANONICAL AGENDA
========================================
${agendaItems.map((item, idx) => `${idx + 1}. [${item.category.toUpperCase()}] ${item.title} (${item.estimatedMinutes} mins)${item.isUnfinishedBusiness ? ' *UNFINISHED BUSINESS*' : ''}${item.notes ? `\n   Notes: ${item.notes}` : ''}`).join('\n')}
========================================
`;

    setMinutesText((prev) => (prev ? `${formattedAgendaText}\n${prev}` : formattedAgendaText));
    setSuccess('Agenda inserted into minutes editor!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSearchKnowledgeBase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!knowledgeSearchQuery.trim()) return;

    setIsSearchingKnowledge(true);
    try {
      const result = await querySecretaryKnowledgeBase(knowledgeSearchQuery);
      setKnowledgeResult(result);
      setIsKnowledgeDrawerOpen(true);
    } catch (err) {
      console.error('Error searching knowledge base:', err);
      setError('Failed to query knowledge base.');
    } finally {
      setIsSearchingKnowledge(false);
    }
  };

  const handleInsertSnippetToMinutes = (snippet: string, title: string) => {
    const noteText = `\n[ARCHIVE REFERENCE - ${title}]:\n"${snippet}"\n`;
    setMinutesText((prev) => `${prev}\n${noteText}`);
    setSuccess('Archive snippet copied to minutes editor notes!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Phase 2 Resolutions & Accountability Handlers
  useEffect(() => {
    let isMounted = true;
    const loadResolutions = async () => {
      setIsLoadingResolutions(true);
      try {
        const data = await fetchActiveResolutions();
        if (isMounted) setResolutions(data);
      } catch (err) {
        console.error('Failed to fetch resolutions:', err);
      } finally {
        if (isMounted) setIsLoadingResolutions(false);
      }
    };
    loadResolutions();
    return () => { isMounted = false; };
  }, []);

  const standardizeRosterNames = (text: string): { updatedText: string; matchedCount: number } => {
    if (!text || !text.trim()) return { updatedText: text, matchedCount: 0 };
    let count = 0;
    let updated = text;

    if (members && members.length > 0) {
      members.forEach((member) => {
        if (!member.name) return;
        const rawName = member.name.trim();
        const nameParts = rawName.split(',').map((s) => s.trim());
        const lastName = nameParts[0];
        const firstName = nameParts[1] || '';

        const titleRegex = new RegExp(`\\b(bro|brother|mr|officer|sec|secretary)\\.?\\s+(${firstName}|${lastName})\\b`, 'gi');
        if (titleRegex.test(updated)) {
          updated = updated.replace(titleRegex, rawName);
          count++;
        }

        if (firstName && lastName) {
          const firstLastRegex = new RegExp(`\\b${firstName}\\s+${lastName}\\b`, 'gi');
          if (firstLastRegex.test(updated)) {
            updated = updated.replace(firstLastRegex, rawName);
            count++;
          }
        }
      });
    }

    return { updatedText: updated, matchedCount: count };
  };

  const handleStopListenerAndProcess = async () => {
    stopListening();
    setIsPostProcessing(true);
    try {
      const { updatedText, matchedCount } = standardizeRosterNames(minutesText);
      if (updatedText !== minutesText) {
        setMinutesText(updatedText);
      }

      const extracted = await extractResolutionsFromMinutes(updatedText);
      if (extracted && extracted.length > 0) {
        setExtractedMotions(extracted);
      }

      setPostStreamBannerInfo({
        show: true,
        standardizedNamesCount: matchedCount,
        extractedMotionsCount: extracted ? extracted.length : 0
      });

      setSuccess('AI Live Stream Saved & Processed!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Post-stream processing error:', err);
      setError('Failed during post-stream processing.');
    } finally {
      setIsPostProcessing(false);
    }
  };

  const handleResetLiveFeed = () => {
    resetTranscript();
    setMinutesText('');
    setPostStreamBannerInfo(null);
    setSuccess('Live transcript feed and speech buffer reset successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExtractMotions = async () => {
    if (!minutesText.trim()) {
      setError('Please enter or transcribe minutes text before extracting resolutions.');
      return;
    }
    setIsExtractingMotions(true);
    try {
      const items = await extractResolutionsFromMinutes(minutesText);
      setExtractedMotions(items);
      setIsExtractedModalOpen(true);
    } catch (err) {
      console.error('Error extracting motions:', err);
      setError('Failed to extract resolutions from minutes text.');
    } finally {
      setIsExtractingMotions(false);
    }
  };

  const handleConfirmSaveExtractedMotions = async () => {
    if (!extractedMotions || extractedMotions.length === 0) return;
    setIsSavingExtracted(true);
    try {
      const createdList: Resolution[] = [];
      for (const motion of extractedMotions) {
        const res = await createResolution(motion);
        if (res) createdList.push(res);
      }
      setResolutions((prev) => [...createdList, ...prev]);
      setIsExtractedModalOpen(false);
      setExtractedMotions(null);
      setSuccess(`Successfully committed ${createdList.length} resolution(s) to accountability ledger!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving extracted motions:', err);
      setError('Failed to save extracted motions.');
    } finally {
      setIsSavingExtracted(false);
    }
  };

  const handleOpenClosureModal = (res: Resolution) => {
    setClosureResolution(res);
    setEvidenceUrlInput(res.evidence_url || '');
    setEvidenceNotesInput(res.evidence_notes || '');
  };

  const handleUpdateResolutionStatusAction = async (targetStatus: Resolution['status']) => {
    if (!closureResolution) return;
    setIsUpdatingStatus(true);
    try {
      const success = await updateResolutionStatus(
        closureResolution.id,
        targetStatus,
        evidenceUrlInput || undefined,
        evidenceNotesInput || undefined
      );
      if (success) {
        setResolutions((prev) =>
          prev.map((r) =>
            r.id === closureResolution.id
              ? {
                  ...r,
                  status: targetStatus,
                  evidence_url: evidenceUrlInput || r.evidence_url,
                  evidence_notes: evidenceNotesInput || r.evidence_notes
                }
              : r
          )
        );
        setSuccess(`Resolution status updated to "${targetStatus}"!`);
        setTimeout(() => setSuccess(''), 3000);
        setClosureResolution(null);
      }
    } catch (err) {
      console.error('Error updating resolution status:', err);
      setError('Failed to update resolution status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateManualResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResTitle || !newResDesc) {
      setError('Please provide resolution title and description.');
      return;
    }
    setIsCreatingResolution(true);
    try {
      const newRes = await createResolution({
        title: newResTitle,
        description: newResDesc,
        mover_name: newResMover || 'General Assembly',
        seconder_name: newResSeconder || 'Executive Committee',
        vote_type: newResVoteType,
        assigned_officer_id: newResOfficerId,
        assigned_officer_name: newResOfficerName,
        deadline: newResDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'Assigned'
      });

      if (newRes) {
        setResolutions((prev) => [newRes, ...prev]);
        setIsCreateModalOpen(false);
        setNewResTitle('');
        setNewResDesc('');
        setNewResMover('');
        setNewResSeconder('');
        setSuccess('New resolution created and assigned!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error creating resolution:', err);
      setError('Failed to create resolution.');
    } finally {
      setIsCreatingResolution(false);
    }
  };

  // Phase 3 Governance Sentinel & Succession Handlers
  const handleAuditCompliance = async () => {
    const textToAudit = minutesText.trim() || 'General Assembly Financial Disbursement and Dues Review';
    setIsAuditingCompliance(true);
    try {
      const result = await evaluateConstitutionalCompliance(textToAudit);
      setComplianceResult(result);
      setIsComplianceModalOpen(true);
    } catch (err) {
      console.error('Error auditing compliance:', err);
      setError('Failed to evaluate constitutional compliance.');
    } finally {
      setIsAuditingCompliance(false);
    }
  };

  const handleGenerateHandover = async () => {
    setIsGeneratingHandover(true);
    try {
      const dossier = await generateHandoverPackage('2025 – 2026');
      setHandoverDossier(dossier);
      setIsHandoverModalOpen(true);
    } catch (err) {
      console.error('Error generating handover package:', err);
      setError('Failed to generate executive handover package.');
    } finally {
      setIsGeneratingHandover(false);
    }
  };

  const handleExportHandoverDossier = () => {
    if (!handoverDossier) return;

    const textContent = `
======================================================
HOLY CROSS CMO GENERAL SECRETARY EXECUTIVE HANDOVER DOSSIER
Tenure Period: ${handoverDossier.tenurePeriod}
Generated: ${new Date(handoverDossier.generatedAt).toLocaleString()}
======================================================

EXECUTIVE SUMMARY:
${handoverDossier.summaryReport}

METRICS & LEDGER STATS:
- Total Registered Members: ${handoverDossier.totalRegisteredMembers}
- Pending Resolutions & Actions: ${handoverDossier.pendingResolutionsCount}
- Closed & Verified Resolutions: ${handoverDossier.closedResolutionsCount}
- Archived Meeting Minutes: ${handoverDossier.archivedMinutesCount}

ACTIVE COMMITMENTS & OUTSTANDING TASKS:
${handoverDossier.activeCommitments.map((c, i) => `${i + 1}. ${c}`).join('\n')}

CONSTITUTIONAL & GOVERNANCE HIGHLIGHTS:
${handoverDossier.constitutionalHighlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

======================================================
Certified & Formally Transferred by Outgoing Secretariat
`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMO_Executive_Handover_Dossier_${handoverDossier.tenurePeriod.replace(/\s+/g, '_')}.txt`;
    a.click();

    setSuccess('Executive Handover Dossier exported successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredResolutions = resolutions.filter((res) => {
    if (resolutionFilter === 'ALL') return true;
    return res.status === resolutionFilter;
  });

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handler A: Verify Input Credentials
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'GENERAL_SECRETARY',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('general_secretary_session_unlocked', 'true');
        setPinInput("");
      } else {
        setPinError("Invalid Executive Security PIN. Access Denied.");
      }
    } catch (error: any) {
      console.error("Security Gateway Exception:", error.message);
      setPinError("Verification gateway encountered an error.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockDashboard = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('general_secretary_session_unlocked');
  };

  // Handler B: Re-hash and Mutation API
  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'GENERAL_SECRETARY',
        old_pin: currentPin,
        new_pin: newPin
      });
      if (error) throw error;
      if (isSuccess) {
        setPinChangeSuccess(true);
        setCurrentPin("");
        setNewPin("");
        setTimeout(() => {
          setIsChangingPin(false);
          setPinChangeSuccess(false);
        }, 2000);
      } else {
        setPinChangeError("Current Gateway PIN is invalid.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to persist security token update.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  const simulateAITranscription = () => {
    setIsRecording(true);
    setTimeout(() => {
      const template = `HOLY CROSS CMO MEETING MINUTES
Date: ${new Date().toLocaleDateString()}
Time: [Insert Time]
Venue: [Insert Venue]

ATTENDANCE:
- Parish Priest: [Name]
- Financial Secretary: Dondo, Christopher
- Welfare Officer: Okafor, Emmanuel
- Treasurer: Ibrahim, Musa
- General Secretary: Eze, Chukwuma
- Members Present: [Count]

AGENDA:
1. Opening Prayer
2. Review of Previous Minutes
3. Financial Report
4. Welfare Report
5. General Business
6. Closing Prayer

DISCUSSIONS:
[AI-captured discussion points will appear here...]

ACTION ITEMS:
- [ ] [Action item 1]
- [ ] [Action item 2]

NEXT MEETING: [Date and Time]

Recorded by: ${currentUser?.name}`;

      setMinutesText(template);
      setIsRecording(false);
      setSuccess('AI transcription complete!');
      setTimeout(() => setSuccess(''), 3000);
    }, 2000);
  };

  const exportMinutes = () => {
    const blob = new Blob([minutesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMO_Minutes_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();

    // Save to archives
    const newMinute = {
      id: `MIN-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: minutesText.split('\n')[0] || 'Published Minutes',
      author: currentUser?.name || 'General Secretary'
    };
    const updated = [newMinute, ...savedMinutes];
    setSavedMinutes(updated);
    localStorage.setItem('cmo_meeting_minutes', JSON.stringify(updated));

    setSuccess('Minutes exported and saved to archives!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteMinute = (id: string) => {
    const updated = savedMinutes.filter(m => m.id !== id);
    setSavedMinutes(updated);
    localStorage.setItem('cmo_meeting_minutes', JSON.stringify(updated));
    setSuccess('Minute record deleted from archives');
    setTimeout(() => setSuccess(''), 3000);
  };

  const generateAnnouncementId = (): string => `ANN-${Date.now()}`;

  const postAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill announcement title and content');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'General Secretary',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Announcement posted successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-0">General Secretary Department</h2>
        {isExecutiveUnlocked && (
          <div className="flex items-center gap-3 self-stretch sm:self-auto flex-wrap">
            <button
              onClick={handleGenerateHandover}
              disabled={isGeneratingHandover}
              className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] px-3.5 py-2 rounded text-sm font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer justify-center"
              title="Generate Executive Handover Transition Package"
            >
              {isGeneratingHandover ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Handover...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  Executive Handover Package
                </>
              )}
            </button>

            <button
              onClick={handleLockDashboard}
              className="bg-[#002520] hover:bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer justify-center"
              title="Lock Executive Workspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Lock Dashboard
            </button>
          </div>
        )}
      </div>

      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.name}
                size="sm"
                extraContent={
                  <>
                    <div className="border-t border-white/10 my-4" />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsChangingPin(!isChangingPin);
                        setPinChangeError(null);
                        setPinChangeSuccess(false);
                      }} 
                      className="text-[10px] text-gray-600 hover:text-[#ffd700] transition-colors block ml-auto focus:outline-none cursor-pointer"
                    >
                      Manage Gateway Access
                    </button>
                    {isChangingPin && (
                      <form onSubmit={handleUpdateExecutivePin} className="mt-4 p-4 bg-[#001f1a] rounded border border-[#ffd700]/20 space-y-3 text-left">
                        <h4 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Modify Gateway Authorization PIN</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">Current PIN</label>
                            <input type="password" maxLength={6} placeholder="••••••" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">New Secret PIN</label>
                            <input type="password" maxLength={6} placeholder="••••••" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                          </div>
                        </div>
                        {pinChangeError && <p className="text-red-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                        {pinChangeSuccess && <p className="text-green-400 text-xs font-semibold text-center">PIN successfully updated!</p>}
                        <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40 cursor-pointer">
                          {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                        </button>
                      </form>
                    )}
                  </>
                }
              />
            </div>
            <div className="flex-grow w-full">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Name</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                  {currentUser.office_title && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">{currentUser.office_title}</span>
                  )}
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                  <p className="text-[#ffd700] font-bold text-sm">GENERAL SECRETARY</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ANNOUNCEMENTS</p>
                  <p className="text-sm font-black text-white">
                    {announcementsCount !== null ? `${announcementsCount} Published` : '0 Published'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!isExecutiveUnlocked ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
          <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features.</p>
          </div>
          <form onSubmit={handleVerifyPin} className="w-full space-y-4">
            <input type="password" maxLength={6} placeholder="Enter Secret PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono" />
            {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
            <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
              {isVerifyingPin ? "Verifying..." : "Unlock Secretary Portal"}
            </button>
          </form>
        </div>
      ) : (
        <Tabs defaultValue="minutes" className="w-full">
          <TabsList className="bg-[#002520] border border-[#ffd700]/20 w-full justify-start p-1 flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="minutes" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Meeting Minutes & Records
            </TabsTrigger>
            <TabsTrigger value="resolutions" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Resolutions & Accountability
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Announcements & Broadcasts
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Media & Gallery Pipeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minutes" className="space-y-6">
            {/* Pre-Meeting Workspace & Executive AI Staging Banner */}
            <Card className="bg-[#002520] border-2 border-[#ffd700]/40 p-6 rounded-xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#ffd700]/20 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ffd700]" />
                    Pre-Meeting Workspace & Executive AI Staging
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure live meeting quorum, auto-generate time-boxed agendas, and search constitutional knowledge archives.
                  </p>
                </div>

                <Button
                  onClick={handleGenerateAgenda}
                  disabled={isGeneratingAgenda}
                  className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer shrink-0"
                >
                  {isGeneratingAgenda ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Agenda...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Agenda
                    </>
                  )}
                </Button>
              </div>

              {/* Quorum Counter & Status Widget Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Quorum Counter Control */}
                <div className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-lg flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#ffd700]" />
                      Present Members Counter
                    </span>
                    {isCalculatingQuorum && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffd700]" />}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPresentMembersCount((prev) => Math.max(0, prev - 1))}
                      className="w-9 h-9 rounded bg-[#002520] border border-[#ffd700]/30 text-[#ffd700] font-bold text-lg hover:bg-[#ffd700]/20 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={presentMembersCount}
                      onChange={(e) => setPresentMembersCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#00100d] border border-[#ffd700]/30 text-white text-center font-bold text-lg py-1.5 rounded focus:outline-none focus:border-[#ffd700]"
                    />
                    <button
                      type="button"
                      onClick={() => setPresentMembersCount((prev) => prev + 1)}
                      className="w-9 h-9 rounded bg-[#002520] border border-[#ffd700]/30 text-[#ffd700] font-bold text-lg hover:bg-[#ffd700]/20 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Live Quorum Status Badge */}
                <div className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-lg flex flex-col justify-between space-y-2 lg:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Constitutional Quorum Status
                  </span>

                  {quorumStatus ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {quorumStatus.hasQuorum ? (
                          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{quorumStatus.presentMembers} / {quorumStatus.quorumRequired} Required — Quorum Reached</span>
                          </div>
                        ) : (
                          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{quorumStatus.presentMembers} / {quorumStatus.quorumRequired} Required — Quorum Not Met</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-300 font-mono flex items-center gap-3">
                        <span>Total Active: <strong className="text-white">{quorumStatus.totalMembers}</strong></span>
                        <span>Attendance: <strong className="text-[#ffd700]">{quorumStatus.percentagePresent}%</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#ffd700]" />
                      <span>Calculating constitutional quorum metrics...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable AI Pre-Meeting Agenda Drawer */}
              {agendaItems && agendaItems.length > 0 && (
                <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <button
                      type="button"
                      onClick={() => setIsAgendaDrawerOpen(!isAgendaDrawerOpen)}
                      className="flex items-center gap-2 text-sm font-bold text-[#ffd700] hover:underline cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-[#ffd700]" />
                      <span>AI Time-Boxed Meeting Agenda ({agendaItems.reduce((acc, i) => acc + i.estimatedMinutes, 0)} Total Mins)</span>
                      {isAgendaDrawerOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    <Button
                      onClick={handleInsertAgendaToMinutes}
                      className="bg-[#ffd700]/10 border border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] text-xs py-1 px-3 h-auto font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Insert Agenda into Minutes</span>
                    </Button>
                  </div>

                  {isAgendaDrawerOpen && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {agendaItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#002520] border border-white/10 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">{item.title}</span>
                              <span className="bg-[#001411] text-[#ffd700] border border-[#ffd700]/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {item.category}
                              </span>
                              {item.isUnfinishedBusiness && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  Unfinished Business
                                </span>
                              )}
                            </div>
                            {item.notes && <p className="text-gray-400 text-[11px]">{item.notes}</p>}
                          </div>

                          <div className="flex items-center gap-1 text-gray-300 font-mono text-xs shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#ffd700]" />
                            <span>{item.estimatedMinutes} mins</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Secretary Knowledge Base Search Bar */}
              <div className="border-t border-[#ffd700]/20 pt-4 space-y-4">
                <form onSubmit={handleSearchKnowledgeBase} className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={knowledgeSearchQuery}
                      onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                      placeholder="Search Archive Knowledge Base (Constitution, Minutes, Resolutions)..."
                      className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#ffd700]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSearchingKnowledge || !knowledgeSearchQuery.trim()}
                    className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 py-2 shrink-0 cursor-pointer"
                  >
                    {isSearchingKnowledge ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Search Archive
                      </>
                    )}
                  </Button>
                </form>

                {/* Knowledge Search Results Side Drawer / Expandable Panel */}
                {knowledgeResult && isKnowledgeDrawerOpen && (
                  <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-xs font-semibold text-[#ffd700] flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        {knowledgeResult.summary}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsKnowledgeDrawerOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {knowledgeResult.relevantMinutes.map((snippet) => (
                        <div key={snippet.id} className="bg-[#002520] border border-white/10 p-3 rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-bold text-white">{snippet.title}</h5>
                              <span className="text-[10px] text-gray-400 font-mono">{snippet.date}</span>
                            </div>
                            <Button
                              onClick={() => handleInsertSnippetToMinutes(snippet.snippet, snippet.title)}
                              className="bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] text-[11px] py-1 px-2.5 h-auto font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Note</span>
                            </Button>
                          </div>
                          <p className="text-gray-300 text-xs italic bg-[#00100d] p-2 rounded border border-white/5">
                            "{snippet.snippet}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Meeting Minutes Editor card */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-[#ffd700]" />
                  Meeting Minutes Editor
                </h3>

                {/* Live Audio Streaming Active or Paused Indicator Badge */}
                {isListening && (
                  <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                    <span>Live Audio Stream Active — Speak naturally into microphone...</span>
                  </div>
                )}
                {transcriberStatus === 'paused' && (
                  <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
                    <Pause className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Live Audio Stream Paused — Click Resume to continue recording...</span>
                  </div>
                )}
              </div>

              {/* Microphone & Web Speech Error Banner */}
              {transcriberError && (
                <div className="bg-red-500/15 border border-red-500/40 text-red-300 p-3 rounded-lg mb-4 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{transcriberError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={startListening}
                    className="underline text-red-200 hover:text-white font-semibold cursor-pointer shrink-0"
                  >
                    Retry Access
                  </button>
                </div>
              )}

              {/* Interim Live Transcript Stream Preview */}
              {isListening && interimTranscript && (
                <div className="bg-[#00100d] border border-[#ffd700]/30 p-3 rounded-lg mb-4 flex items-center gap-2 text-xs">
                  <Volume2 className="w-4 h-4 text-[#ffd700] animate-bounce shrink-0" />
                  <span className="text-gray-400 font-semibold shrink-0">Live Stream Preview:</span>
                  <span className="text-[#ffd700] font-mono italic truncate">{interimTranscript}</span>
                </div>
              )}

              {/* Phase 3 Post-Stream Multi-Agent Pipeline Status & Completion Banner */}
              {isPostProcessing && (
                <div className="bg-[#001a16] border border-emerald-500/40 text-emerald-300 p-4 rounded-xl mb-4 flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">AI Multi-Agent Pipeline Active</h4>
                    <p className="text-[11px] text-gray-300">Standardizing officer roster references and extracting floor motions from live stream...</p>
                  </div>
                </div>
              )}

              {postStreamBannerInfo?.show && !isPostProcessing && (
                <div className="bg-[#001a16] border border-emerald-500/50 p-4 rounded-xl mb-4 space-y-3 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center text-sm font-bold text-emerald-400">
                      <Sparkles className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                      <span>AI Live Stream Saved &amp; Processed!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPostStreamBannerInfo((prev) => prev ? { ...prev, show: false } : null)}
                      className="text-gray-400 hover:text-white transition-colors text-xs cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={() => {
                        setIsRosterVerified(true);
                        setSuccess(
                          postStreamBannerInfo.standardizedNamesCount > 0
                            ? `Verified & standardized ${postStreamBannerInfo.standardizedNamesCount} member name(s) against official roster!`
                            : 'Member roster verified against official membership registry.'
                        );
                        setTimeout(() => setSuccess(''), 3500);
                      }}
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs py-1.5 px-3 h-auto font-bold flex items-center cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 mr-1 text-emerald-400 shrink-0" />
                      <span>Verify Roster Names {postStreamBannerInfo.standardizedNamesCount > 0 ? `(${postStreamBannerInfo.standardizedNamesCount} Standardized)` : ''}</span>
                    </Button>

                    <Button
                      onClick={() => {
                        if (extractedMotions && extractedMotions.length > 0) {
                          setIsExtractedModalOpen(true);
                        } else {
                          handleExtractMotions();
                        }
                      }}
                      variant="outline"
                      className="border-[#ffd700]/40 bg-[#ffd700]/10 text-[#ffd700] hover:bg-[#ffd700]/20 text-xs py-1.5 px-3 h-auto font-bold flex items-center cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4 mr-1 text-[#ffd700] shrink-0" />
                      <span>Review Extracted Motions ({postStreamBannerInfo.extractedMotionsCount} Detected)</span>
                    </Button>

                    <Button
                      onClick={handleAuditCompliance}
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs py-1.5 px-3 h-auto font-bold flex items-center cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 mr-1 text-amber-400 shrink-0" />
                      <span>Run Constitutional Check</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Hidden native inputs for multimodal document OCR */}
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".pdf,.txt,.doc,.docx,image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />

                {/* Real-Time Floor Mic Management Panel */}
                <div className="p-4 bg-[#001a16] border-2 border-emerald-500/40 rounded-xl space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isFloorActive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                          Floor Mic Control Center
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isFloorActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-800 text-gray-400'}`}>
                            {isFloorActive ? 'Floor Open' : 'Floor Locked'}
                          </span>
                        </h4>
                        <p className="text-xs text-gray-300">Master controls for member push-to-talk audio streaming</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => toggleFloor(!isFloorActive)}
                      className={
                        isFloorActive
                          ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-bold text-xs cursor-pointer"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold text-xs cursor-pointer"
                      }
                    >
                      {isFloorActive ? 'Lock Floor Mics' : 'Open Floor for Members'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Active Speaker Card */}
                    <div className="p-3.5 bg-[#002520] border border-amber-500/30 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-amber-400" />
                        Current Live Floor Speaker
                      </div>
                      {activeSpeaker ? (
                        <div className="flex items-center justify-between gap-2 p-2 bg-[#001a16] rounded-lg border border-amber-500/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {activeSpeaker.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white text-xs truncate">{activeSpeaker.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{activeSpeaker.official_member_id || activeSpeaker.id}</p>
                            </div>
                          </div>
                          <Button
                            onClick={revokeFloor}
                            className="bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[11px] py-1 px-2.5 h-auto font-bold border border-red-500/40 shrink-0 cursor-pointer"
                          >
                            Mute & Revoke Mic
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic p-2 bg-[#001a16] rounded-lg text-center">
                          No active floor speaker. Grant mic to a member from the queue.
                        </p>
                      )}
                    </div>

                    {/* Speak Queue List */}
                    <div className="p-3.5 bg-[#002520] border border-emerald-500/20 rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          Speak Queue
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/30">
                          {speakQueue.length} Waiting
                        </span>
                      </div>
                      {speakQueue.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {speakQueue.map((mId, index) => {
                            const memberObj = members.find(m => m.id === mId || m.official_member_id === mId);
                            const mName = memberObj?.full_name || memberObj?.name || mId;
                            return (
                              <div key={mId} className="flex items-center justify-between gap-2 p-2 bg-[#001a16] rounded-lg text-xs">
                                <span className="font-semibold text-gray-200 truncate">
                                  #{index + 1} {mName}
                                </span>
                                <Button
                                  onClick={() => grantFloor(mId)}
                                  className="bg-emerald-500 text-[#001a16] hover:bg-emerald-400 text-[10px] py-0.5 px-2 h-auto font-bold shrink-0 cursor-pointer"
                                >
                                  Grant Floor
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic p-2 bg-[#001a16] rounded-lg text-center">
                          Queue is empty. Members will appear here when they push to speak.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  {/* Dynamic Voice Listener Toggle Button */}
                  <Button
                    onClick={isListening ? handleStopListenerAndProcess : transcriberStatus === 'paused' ? resumeListening : startListening}
                    disabled={isPostProcessing}
                    className={
                      isListening
                        ? "bg-red-500/20 text-red-300 border border-red-500/50 ring-2 ring-red-500/30 hover:bg-red-500/30 font-bold cursor-pointer transition-all flex items-center"
                        : "bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold cursor-pointer transition-all flex items-center"
                    }
                  >
                    {isPostProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 text-emerald-400 mr-2 animate-spin" />
                        Processing AI Pipeline...
                      </>
                    ) : isListening ? (
                      <>
                        <MicOff className="w-4 h-4 text-red-400 mr-2 animate-pulse" />
                        Stop Listener (Listening Live...)
                      </>
                    ) : transcriberStatus === 'paused' ? (
                      <>
                        <Mic className="w-4 h-4 text-emerald-400 mr-2" />
                        Resume Speech Listener
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-emerald-400 mr-2" />
                        Start AI Real-Time Listener
                      </>
                    )}
                  </Button>

                  {/* Attachment Button for Document & OCR Photo Extraction */}
                  <Button
                    onClick={() => setIsAttachmentMenuOpen(true)}
                    disabled={isExtractingDocument}
                    className="bg-[#002818] border border-amber-400/50 text-amber-300 hover:bg-emerald-900/60 font-bold cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isExtractingDocument ? (
                      <>
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Transcribing Document...</span>
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4 text-amber-400" />
                        <span>Attach Notes / OCR Photo</span>
                      </>
                    )}
                  </Button>

                  {/* Pause / Resume Listener Button */}
                  {(isListening || transcriberStatus === 'paused') && (
                    <Button
                      onClick={isListening ? pauseListening : resumeListening}
                      disabled={isPostProcessing}
                      variant="outline"
                      className={
                        transcriberStatus === 'paused'
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold text-xs cursor-pointer flex items-center transition-all"
                          : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold text-xs cursor-pointer flex items-center transition-all"
                      }
                    >
                      {transcriberStatus === 'paused' ? (
                        <>
                          <Play className="w-4 h-4 text-emerald-400 mr-1.5 animate-pulse" />
                          Resume Listener
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 text-amber-400 mr-1.5" />
                          Pause Listener
                        </>
                      )}
                    </Button>
                  )}

                  {/* Reset Live Feed Button */}
                  {(isListening || transcriberStatus === 'paused' || minutesText) && (
                    <Button
                      onClick={handleResetLiveFeed}
                      variant="outline"
                      className="border-[#ffd700]/30 text-gray-300 hover:text-white hover:bg-white/5 font-semibold text-xs cursor-pointer flex items-center"
                      title="Clear live transcriber memory buffer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#ffd700]" />
                      Reset Live Feed
                    </Button>
                  )}

                  <Button
                    onClick={handleExtractMotions}
                    disabled={isExtractingMotions || !minutesText.trim()}
                    className="bg-[#ffd700]/10 border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] font-bold cursor-pointer flex items-center gap-2"
                  >
                    {isExtractingMotions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting Motions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Extract Motions to Resolutions
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleAuditCompliance}
                    disabled={isAuditingCompliance}
                    className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold cursor-pointer flex items-center gap-2"
                  >
                    {isAuditingCompliance ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Auditing Compliance...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        Audit Compliance
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={exportMinutes}
                    disabled={!minutesText}
                    variant="outline"
                    className="border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] font-bold cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export & Publish Minutes
                  </Button>
                </div>

                <textarea
                  value={minutesText}
                  onChange={(e) => setMinutesText(e.target.value)}
                  placeholder="Live minutes transcript will stream here in real time as the speaker talks..."
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-4 rounded-lg min-h-[400px] font-mono text-sm focus:outline-none focus:border-[#ffd700]"
                />
              </div>
            </Card>

            {/* Attachment Action Modal / Sheet */}
            {isAttachmentMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                onClick={() => setIsAttachmentMenuOpen(false)}
              >
                {/* Modal / Bottom Sheet Box */}
                <div 
                  className="w-full sm:max-w-md bg-[#001f13] border-t-2 sm:border-2 border-amber-400/40 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 text-emerald-100 overflow-hidden max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-amber-400 shrink-0" />
                      <h2 className="text-base sm:text-lg font-bold text-amber-400 tracking-tight leading-tight">
                        Attach Document or Notes Photo
                      </h2>
                    </div>
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      className="p-1 text-emerald-300 hover:text-amber-400 hover:bg-emerald-900/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Helper Description */}
                  <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed mb-4">
                    Choose a source to snap or upload handwritten meeting notes, printed reports, or physical resolutions. Multimodal AI will automatically extract, translate, and format the text into your live minutes editor.
                  </p>

                  {/* Action Buttons List */}
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {/* Camera Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-3 sm:p-3.5 bg-emerald-950/60 border border-emerald-700/60 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="p-2.5 bg-emerald-900/80 text-emerald-300 group-hover:text-amber-400 rounded-lg shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-emerald-100 text-sm group-hover:text-amber-400 transition-colors">
                          Camera
                        </div>
                        <div className="text-xs text-emerald-300/80 truncate">
                          Snap a photo of handwritten notes or printed agenda directly
                        </div>
                      </div>
                    </button>

                    {/* Photos Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        photoInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-3 sm:p-3.5 bg-emerald-950/60 border border-emerald-700/60 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="p-2.5 bg-emerald-900/80 text-amber-400 rounded-lg shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-emerald-100 text-sm group-hover:text-amber-400 transition-colors">
                          Photos
                        </div>
                        <div className="text-xs text-emerald-300/80 truncate">
                          Choose an image from your photo library or gallery
                        </div>
                      </div>
                    </button>

                    {/* Files Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-3 sm:p-3.5 bg-emerald-950/60 border border-emerald-700/60 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="p-2.5 bg-emerald-900/80 text-sky-400 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-emerald-100 text-sm group-hover:text-amber-400 transition-colors">
                          Files
                        </div>
                        <div className="text-xs text-emerald-300/80 truncate">
                          Upload PDF, Word document, or text file from device
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Modal Cancel Footer */}
                  <div className="mt-4 pt-3 border-t border-amber-500/20 flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-emerald-200 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Minutes History / Archive table */}
            <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Minutes Archive</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Title</th>
                      <th className="py-2.5 px-4">Author</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedMinutes.map((minute) => (
                      <tr key={minute.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-300 text-xs">{minute.date}</td>
                        <td className="py-3 px-4 text-white font-semibold text-xs">{minute.title}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs font-semibold">{minute.author}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            onClick={() => handleDeleteMinute(minute.id)}
                            className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 text-xs px-2.5 py-1 h-auto cursor-pointer"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {savedMinutes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400 italic text-xs">No archived minute records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Phase 2 Resolutions & Accountability Tab Content */}
          <TabsContent value="resolutions" className="space-y-6">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#ffd700]/20 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-[#ffd700]" />
                    Assembly Resolutions & Executive Task Lifecycle
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Track floor motions, officer accountability deadlines, and evidence verification for action closure.
                  </p>
                </div>

                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  New Floor Resolution
                </Button>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-400 mr-1" />
                  {['ALL', 'Assigned', 'In Progress', 'Evidence Uploaded', 'Closed'].map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setResolutionFilter(filterKey)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        resolutionFilter === filterKey
                          ? 'bg-[#ffd700] text-[#001a16]'
                          : 'bg-[#001a16] text-gray-300 border border-[#ffd700]/20 hover:border-[#ffd700]/50'
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-gray-400 font-mono">
                  Showing {filteredResolutions.length} of {resolutions.length} resolution(s)
                </span>
              </div>

              {/* Resolutions Grid */}
              {isLoadingResolutions ? (
                <div className="flex items-center justify-center py-12 text-[#ffd700] gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading assembly resolutions ledger...</span>
                </div>
              ) : filteredResolutions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#ffd700]/20 rounded-xl space-y-2">
                  <CheckSquare className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-gray-400 text-sm italic">No resolutions found for filter "{resolutionFilter}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredResolutions.map((res) => (
                    <div
                      key={res.id}
                      className="bg-[#001a16] border border-[#ffd700]/20 rounded-xl p-5 space-y-4 flex flex-col justify-between hover:border-[#ffd700]/50 transition-colors shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="bg-[#002520] text-[#ffd700] border border-[#ffd700]/30 px-2 py-0.5 rounded text-[10px] font-mono">
                            {res.vote_type}
                          </span>
                          {res.status === 'Assigned' && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              Assigned
                            </span>
                          )}
                          {res.status === 'In Progress' && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                              In Progress
                            </span>
                          )}
                          {res.status === 'Evidence Uploaded' && (
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-purple-400" />
                              Evidence Uploaded
                            </span>
                          )}
                          {(res.status === 'Verified' || res.status === 'Closed') && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              Verified & Closed
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-white text-base leading-snug">{res.title}</h4>
                        <p className="text-gray-300 text-xs leading-relaxed">{res.description}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-500 block">MOVER / SECONDER</span>
                            <span className="text-gray-300 font-semibold text-[11px] truncate flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-[#ffd700]" />
                              {res.mover_name || 'Assembly'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-500 block">ASSIGNED OFFICER</span>
                            <span className="text-[#ffd700] font-semibold text-[11px] truncate block">
                              {res.assigned_officer_name || res.assigned_officer_id || 'General Secretary'}
                            </span>
                          </div>
                        </div>

                        {res.deadline && (
                          <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-[#ffd700]" />
                            <span>Target Deadline: {res.deadline}</span>
                          </div>
                        )}

                        {res.evidence_url && (
                          <div className="bg-[#00100d] border border-purple-500/30 p-2 rounded text-[11px] space-y-1">
                            <span className="text-purple-400 font-semibold flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              Uploaded Evidence Reference
                            </span>
                            <a
                              href={res.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 underline hover:text-blue-300 flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{res.evidence_url}</span>
                            </a>
                            {res.evidence_notes && <p className="text-gray-400 italic">"{res.evidence_notes}"</p>}
                          </div>
                        )}

                        <Button
                          onClick={() => handleOpenClosureModal(res)}
                          className="w-full bg-[#ffd700]/10 border border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] text-xs py-2 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-2"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Action Closure & Evidence</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            {/* Publish Announcement widget */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Publish Announcement</h3>
              <div className="space-y-4 mb-6">
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Announcement details..."
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded-lg min-h-[120px] focus:outline-none focus:border-[#ffd700] text-sm"
                />
                <Button
                  onClick={postAnnouncement}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold cursor-pointer"
                >
                  Publish Announcement
                </Button>
              </div>

              <div className="border-t border-[#ffd700]/20 my-6" />

              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#ffd700]" />
                Secretary Announcement Feed
              </h3>
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[#ffd700] font-semibold">{ann.title}</p>
                      <span className="text-xs text-gray-500 font-mono">{new Date(ann.timestamp || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{ann.content}</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-semibold">Posted by: {ann.author || 'General Secretary'}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-gray-400 text-center py-8 italic text-sm">No announcements posted yet.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <GeneralGalleryManager
              currentUserName={currentUser?.name || 'General Secretary'}
              isExecutive={isExecutiveUnlocked}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Extracted Motions Preview Modal */}
      {isExtractedModalOpen && extractedMotions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002520] border-2 border-[#ffd700] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-lg font-bold text-[#ffd700] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ffd700]" />
                Parsed Floor Motions Preview ({extractedMotions.length} Item(s))
              </h3>
              <button
                type="button"
                onClick={() => setIsExtractedModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {extractedMotions.map((item, idx) => (
                <div key={idx} className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">{item.title}</span>
                    <span className="bg-[#002520] text-[#ffd700] border border-[#ffd700]/30 px-2 py-0.5 rounded text-[10px]">
                      {item.vote_type}
                    </span>
                  </div>
                  <p className="text-gray-300">{item.description}</p>
                  <div className="flex justify-between items-center text-gray-400 font-mono text-[11px] pt-2 border-t border-white/5">
                    <span>Assigned: {item.assigned_officer_name || 'General Secretary'}</span>
                    <span>Deadline: {item.deadline}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#ffd700]/20">
              <Button
                type="button"
                onClick={() => setIsExtractedModalOpen(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSaveExtractedMotions}
                disabled={isSavingExtracted}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingExtracted ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving to Database...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Commit Resolutions to Ledger
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Closure & Evidence Upload Modal */}
      {closureResolution && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002520] border-2 border-[#ffd700] rounded-xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-lg font-bold text-[#ffd700] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#ffd700]" />
                Action Closure & Evidence Verification
              </h3>
              <button
                type="button"
                onClick={() => setClosureResolution(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg space-y-1 text-xs">
              <h4 className="font-bold text-white text-sm">{closureResolution.title}</h4>
              <p className="text-gray-300">{closureResolution.description}</p>
              <div className="text-gray-400 font-mono text-[11px] pt-1">
                Assigned to: <strong className="text-[#ffd700]">{closureResolution.assigned_officer_name || closureResolution.assigned_officer_id}</strong>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#ffd700]" />
                  Evidence Document / Receipt URL
                </label>
                <Input
                  value={evidenceUrlInput}
                  onChange={(e) => setEvidenceUrlInput(e.target.value)}
                  placeholder="https://supabase.co/storage/... or document reference link"
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Evidence / Completion Notes</label>
                <textarea
                  value={evidenceNotesInput}
                  onChange={(e) => setEvidenceNotesInput(e.target.value)}
                  placeholder="Summary of action taken, receipt numbers, or audit notes..."
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded-lg min-h-[90px] focus:outline-none focus:border-[#ffd700] text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#ffd700]/20">
              <Button
                type="button"
                onClick={() => handleUpdateResolutionStatusAction('In Progress')}
                disabled={isUpdatingStatus}
                className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold cursor-pointer"
              >
                Mark In Progress
              </Button>
              <Button
                type="button"
                onClick={() => handleUpdateResolutionStatusAction('Evidence Uploaded')}
                disabled={isUpdatingStatus || !evidenceUrlInput}
                className="bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-semibold cursor-pointer"
              >
                Submit Evidence
              </Button>
              <Button
                type="button"
                onClick={() => handleUpdateResolutionStatusAction('Closed')}
                disabled={isUpdatingStatus}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer sm:ml-auto"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Resolution Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateManualResolution} className="bg-[#002520] border-2 border-[#ffd700] rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-lg font-bold text-[#ffd700] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#ffd700]" />
                Record New Assembly Resolution
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Resolution Title</label>
                <Input
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                  placeholder="e.g. Welfare Audit Commission"
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Resolution Details / Mandate</label>
                <textarea
                  value={newResDesc}
                  onChange={(e) => setNewResDesc(e.target.value)}
                  placeholder="Detailed floor motion text and mandate..."
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded-lg min-h-[80px] focus:outline-none focus:border-[#ffd700] text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Mover Name</label>
                  <Input
                    value={newResMover}
                    onChange={(e) => setNewResMover(e.target.value)}
                    placeholder="e.g. Eze, Chukwuma"
                    className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Seconder Name</label>
                  <Input
                    value={newResSeconder}
                    onChange={(e) => setNewResSeconder(e.target.value)}
                    placeholder="e.g. Dondo, Christopher"
                    className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Vote Type</label>
                  <select
                    value={newResVoteType}
                    onChange={(e) => setNewResVoteType(e.target.value as any)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded focus:outline-none focus:border-[#ffd700] text-xs"
                  >
                    <option value="Voice Vote">Voice Vote</option>
                    <option value="Secret Ballot">Secret Ballot</option>
                    <option value="Simple Majority">Simple Majority</option>
                    <option value="2/3 Majority">2/3 Majority</option>
                    <option value="Unanimous">Unanimous</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Assigned Officer</label>
                  <Input
                    value={newResOfficerName}
                    onChange={(e) => setNewResOfficerName(e.target.value)}
                    placeholder="e.g. Financial Secretary"
                    className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Target Completion Deadline</label>
                <Input
                  type="date"
                  value={newResDeadline}
                  onChange={(e) => setNewResDeadline(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#ffd700]/20">
              <Button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingResolution || !newResTitle || !newResDesc}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 flex items-center gap-1.5 cursor-pointer"
              >
                {isCreatingResolution ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create & Assign Resolution
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Phase 3 Constitutional Sentinel Advisory Modal */}
      {isComplianceModalOpen && complianceResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002520] border-2 border-[#ffd700] rounded-xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-lg font-bold text-[#ffd700] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#ffd700]" />
                Constitutional Advisory Audit
              </h3>
              <button
                type="button"
                onClick={() => setIsComplianceModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                complianceResult.severity === 'Violation'
                  ? 'bg-red-500/20 border-red-500/40 text-red-200'
                  : complianceResult.severity === 'Warning'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {complianceResult.severity === 'Violation' || complianceResult.severity === 'Warning' ? (
                <AlertTriangle className={`w-5 h-5 shrink-0 ${complianceResult.severity === 'Violation' ? 'text-red-400' : 'text-amber-400'}`} />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold uppercase tracking-wider">
                    {complianceResult.severity} Audit Result
                  </strong>
                </div>
                {complianceResult.articleReference && (
                  <p className="text-[11px] font-mono opacity-90">{complianceResult.articleReference}</p>
                )}
                <p className="text-xs leading-relaxed pt-1">{complianceResult.adviceText}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#ffd700]/20">
              <Button
                type="button"
                onClick={() => setIsComplianceModalOpen(false)}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 cursor-pointer"
              >
                Acknowledge Guidance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 Executive Succession & Handover Dossier Modal */}
      {isHandoverModalOpen && handoverDossier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#002520] border-2 border-[#ffd700] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
              <h3 className="text-lg font-bold text-[#ffd700] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#ffd700]" />
                Executive Succession & Handover Dossier ({handoverDossier.tenurePeriod})
              </h3>
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#ffd700]" />
                Executive Transition Summary
              </span>
              <p className="text-gray-200 leading-relaxed">{handoverDossier.summaryReport}</p>
              <span className="text-[10px] font-mono text-gray-500 block pt-1">
                Generated At: {new Date(handoverDossier.generatedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg text-center space-y-1">
                <span className="text-[10px] text-gray-400 uppercase block">Registered Members</span>
                <strong className="text-white text-lg font-bold">{handoverDossier.totalRegisteredMembers}</strong>
              </div>
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg text-center space-y-1">
                <span className="text-[10px] text-amber-400 uppercase block">Pending Tasks</span>
                <strong className="text-amber-300 text-lg font-bold">{handoverDossier.pendingResolutionsCount}</strong>
              </div>
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg text-center space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase block">Closed Actions</span>
                <strong className="text-emerald-300 text-lg font-bold">{handoverDossier.closedResolutionsCount}</strong>
              </div>
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg text-center space-y-1">
                <span className="text-[10px] text-[#ffd700] uppercase block">Archived Minutes</span>
                <strong className="text-[#ffd700] text-lg font-bold">{handoverDossier.archivedMinutesCount}</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#ffd700] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Active Commitments & Transition Tasks
              </h4>
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg space-y-1.5">
                {handoverDossier.activeCommitments.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#ffd700] font-mono font-bold">{idx + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#ffd700] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Constitutional Governance Highlights
              </h4>
              <div className="bg-[#001a16] border border-white/10 p-3 rounded-lg space-y-1.5">
                {handoverDossier.constitutionalHighlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#ffd700] font-mono font-bold">{idx + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#ffd700]/20">
              <Button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleExportHandoverDossier}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-4 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export Handover Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};