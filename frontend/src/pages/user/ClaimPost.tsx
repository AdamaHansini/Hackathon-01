import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { postsApi } from '../../api/postsApi';
import { usersApi } from '../../api/usersApi';
import { claimsApi } from '../../api/claimsApi';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

export const ClaimPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLostPostId, setSelectedLostPostId] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [claimId, setClaimId] = useState('');
  
  // Answers state: { questionId: answer }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verificationError, setVerificationError] = useState('');

  // 1. Fetch the target found post
  const { 
    data: foundPostData, 
    isLoading: isLoadingFoundPost, 
    isError: isErrorFoundPost,
    error: foundPostError
  } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: !!id,
  });

  // 2. Fetch user's active LOST posts
  const {
    data: myLostPostsData,
    isLoading: isLoadingMyPosts,
  } = useQuery({
    queryKey: ['my-active-lost-posts'],
    queryFn: () => usersApi.getMyPosts({ type: 'LOST', status: 'ACTIVE', limit: 100 }),
  });

  // 3. Fetch verification questions (enabled only in step 2)
  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
  } = useQuery({
    queryKey: ['verification-questions', id],
    queryFn: () => postsApi.getVerificationQuestions(id!),
    enabled: step === 2,
  });

  // Mutations
  const createClaimMutation = useMutation({
    mutationFn: (data: { foundPostId: string; relatedLostPostId: string; claimMessage: string }) => 
      claimsApi.createClaim(data),
    onSuccess: (data) => {
      setClaimId(data.data.claim._id);
      setStep(2);
    },
  });

  const verifyClaimMutation = useMutation({
    mutationFn: (data: { claimId: string; answers: { questionId: string; answer: string }[] }) => 
      claimsApi.verifyClaim(data.claimId, { answers: data.answers }),
    onSuccess: () => {
      setStep(3);
    },
    onError: (error: any) => {
      setVerificationError(error.message || 'Verification failed. Please check your answers and try again.');
    },
  });

  if (isLoadingFoundPost || isLoadingMyPosts) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isErrorFoundPost || !foundPostData?.data?.post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState message={(foundPostError as any)?.message || 'Post not found'} />
      </div>
    );
  }

  const foundPost = foundPostData.data.post;
  const myLostPosts = myLostPostsData?.data?.items || [];

  const lostPostOptions = [
    { label: 'Select your related lost item...', value: '' },
    ...myLostPosts.map((p: any) => ({
      label: `${p.itemName} - ${new Date(p.lostOrFoundDate).toLocaleDateString()}`,
      value: p._id,
    }))
  ];

  const handleInitiateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLostPostId) return;
    
    createClaimMutation.mutate({
      foundPostId: id!,
      relatedLostPostId: selectedLostPostId,
      claimMessage,
    });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');
    
    const questions = questionsData?.data?.questions || [];
    const formattedAnswers = questions.map((q: any) => ({
      questionId: q._id,
      answer: answers[q._id] || '',
    }));

    verifyClaimMutation.mutate({
      claimId,
      answers: formattedAnswers,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to={`/posts/${id}`} className="inline-flex items-center text-sm font-medium text-muted-text hover:text-dark-text mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to item
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary-button" />
          Claim Item
        </h1>
        <p className="text-muted-text mt-1">
          You are claiming: <span className="font-semibold text-dark-text">{foundPost.itemName}</span>
        </p>
      </div>

      <div className="bg-surface border border-taupe-border rounded-xl shadow-sm overflow-hidden">
        {/* Progress Bar */}
        <div className="flex border-b border-taupe-border bg-light-beige">
          <div className={`flex-1 py-3 px-4 text-center text-sm font-medium ${step >= 1 ? 'text-primary-button border-b-2 border-primary-button bg-primary-button/5' : 'text-muted-text'}`}>
            1. Initiation
          </div>
          <div className={`flex-1 py-3 px-4 text-center text-sm font-medium ${step >= 2 ? 'text-primary-button border-b-2 border-primary-button bg-primary-button/5' : 'text-muted-text'}`}>
            2. Verification
          </div>
          <div className={`flex-1 py-3 px-4 text-center text-sm font-medium ${step === 3 ? 'text-primary-button border-b-2 border-primary-button bg-primary-button/5' : 'text-muted-text'}`}>
            3. Complete
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <form onSubmit={handleInitiateClaim} className="space-y-6">
              <div className="bg-surface border border-taupe-border rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm text-dark-text">
                  <p className="font-semibold mb-1">To claim this item, you must link it to one of your lost item reports.</p>
                  <p className="text-muted-text">
                    If you haven't created a lost item report yet, please do so first from your dashboard. This ensures the finder can verify ownership through the questions you established.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-text mb-2">Select Your Lost Item *</label>
                {myLostPosts.length > 0 ? (
                  <Select
                    options={lostPostOptions}
                    value={selectedLostPostId}
                    onChange={(e) => setSelectedLostPostId(e.target.value)}
                    required
                    className="w-full"
                  />
                ) : (
                  <div className="p-4 border border-warning/20 bg-warning/5 rounded-lg text-sm text-warning-text">
                    You don't have any active lost item reports. <Link to="/posts/create" className="font-semibold underline">Create one now</Link> to proceed.
                  </div>
                )}
              </div>

              <Textarea
                label="Message to Finder (Optional)"
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                placeholder="E.g., I'm so glad you found this! It looks exactly like mine."
                className="h-24 resize-none"
              />

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!selectedLostPostId || createClaimMutation.isPending}
                >
                  {createClaimMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> : null}
                  Continue to Verification
                </Button>
              </div>
              
              {createClaimMutation.isError && (
                <p className="text-error text-sm mt-2 font-medium">
                  {(createClaimMutation.error as any)?.message || 'Failed to initiate claim'}
                </p>
              )}
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {isLoadingQuestions ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 text-primary-button animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                  <h3 className="text-lg font-bold text-dark-text mb-2">Verification Questions</h3>
                  <p className="text-sm text-muted-text mb-6">
                    Please answer the following questions to verify ownership. These questions were established by the finder of this item.
                  </p>

                  {verificationError && (
                    <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm font-medium">
                      {verificationError}
                    </div>
                  )}

                  {!questionsData?.data?.questions || questionsData.data.questions.length === 0 ? (
                    <div className="p-6 bg-light-beige border border-taupe-border rounded-xl text-center">
                      <Check className="h-10 w-10 text-success mx-auto mb-3" />
                      <p className="font-semibold text-dark-text">No verification required.</p>
                      <p className="text-sm text-muted-text mt-1">You didn't set any verification questions for this item.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {questionsData.data.questions.map((q: any, index: number) => (
                        <div key={q._id} className="bg-light-beige p-5 rounded-xl border border-taupe-border">
                          <label className="block text-sm font-semibold text-dark-text mb-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-button text-white text-xs mr-2">
                              {index + 1}
                            </span>
                            {q.question}
                          </label>
                          <Input
                            value={answers[q._id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                            placeholder="Your answer"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-6 flex justify-between items-center">
                    <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-muted-text hover:text-dark-text transition-colors">
                      Back
                    </button>
                    <Button type="submit" disabled={verifyClaimMutation.isPending}>
                      {verifyClaimMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> : null}
                      Submit Answers
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success mb-6">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-dark-text mb-2">Claim Submitted!</h2>
              <p className="text-muted-text mb-8 max-w-md mx-auto">
                Your claim has been successfully submitted and is now under review. We will notify you once the finder reviews it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/claims">
                  <Button variant="secondary" className="w-full sm:w-auto">View My Claims</Button>
                </Link>
                <Link to="/dashboard">
                  <Button className="w-full sm:w-auto">Return to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
