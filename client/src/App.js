import { useState } from 'react';
import GlobalStyles from './GlobalStyles';
import { AppShell } from './components';
import SplashScreen from './SplashScreen';
import { Step1Role, Step2Experience, Step3Concerns, Step4Income, Step5Hours } from './QuizSteps';
import LoadingScreen from './LoadingScreen';
import ResultsScreen from './ResultsScreen';
import ErrorScreen from './ErrorScreen';
import { analyzeSkillGaps } from './api';

const SCREEN = { SPLASH: 'splash', QUIZ: 'quiz', LOADING: 'loading', RESULTS: 'results', ERROR: 'error' };
const BLANK_ANSWERS = { role: '', experience: '', concerns: [], income: '', hours: '' };

export default function App() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(BLANK_ANSWERS);
  const [analysis, setAnalysis] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  function startQuiz() { setStep(1); setScreen(SCREEN.QUIZ); }
  function nextStep() { setStep(s => s + 1); }
  function prevStep() { setStep(s => Math.max(1, s - 1)); }

  async function runAnalysis() {
    setScreen(SCREEN.LOADING);
    try {
      const result = await analyzeSkillGaps(answers);
      setAnalysis(result);
      setScreen(SCREEN.RESULTS);
    } catch (e) {
      setErrMsg(e.message || 'Something went wrong. Please try again.');
      setScreen(SCREEN.ERROR);
    }
  }

  function restart() {
    setAnswers(BLANK_ANSWERS);
    setAnalysis(null);
    setStep(1);
    setScreen(SCREEN.SPLASH);
    window.history.replaceState({}, '', '/');
  }

  return (
    <>
      <GlobalStyles />
      <AppShell>
        {screen === SCREEN.SPLASH && <SplashScreen onStart={startQuiz} />}
        {screen === SCREEN.QUIZ && step === 1 && <Step1Role answers={answers} setAnswers={setAnswers} onNext={nextStep} />}
        {screen === SCREEN.QUIZ && step === 2 && <Step2Experience answers={answers} setAnswers={setAnswers} onNext={nextStep} onBack={prevStep} />}
        {screen === SCREEN.QUIZ && step === 3 && <Step3Concerns answers={answers} setAnswers={setAnswers} onNext={nextStep} onBack={prevStep} />}
        {screen === SCREEN.QUIZ && step === 4 && <Step4Income answers={answers} setAnswers={setAnswers} onNext={nextStep} onBack={prevStep} />}
        {screen === SCREEN.QUIZ && step === 5 && <Step5Hours answers={answers} setAnswers={setAnswers} onAnalyze={runAnalysis} onBack={prevStep} />}
        {screen === SCREEN.LOADING && <LoadingScreen />}
        {screen === SCREEN.RESULTS && analysis && <ResultsScreen analysis={analysis} answers={answers} onRestart={restart} />}
        {screen === SCREEN.ERROR && <ErrorScreen message={errMsg} onRetry={restart} />}
      </AppShell>
    </>
  );
}
