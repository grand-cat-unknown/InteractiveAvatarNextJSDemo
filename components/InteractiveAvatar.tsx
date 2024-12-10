import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import { AssemblyAI, RealtimeTranscript } from 'assemblyai';

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isStoppingAllSessions, setIsStoppingAllSessions] = useState(false);
  const [transcriber, setTranscriber] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: "Ann_Therapist_public",
        knowledgeBase: "My Name is Srikanth. I live in Belgium",
        voice: {
          rate: 1, // 0.5 ~ 1.5
          emotion: VoiceEmotion.FRIENDLY,
          voiceId:"e6f941fd57e64b3ba000c53263d6ba28"
        },
        language: 'nl',
        disableIdleTimeout: true,
      });

      setData(res);
      // default to voice mode
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  const initializeTranscriber = async () => {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      setDebug("AssemblyAI API key not found");
      return null;
    }

    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY || ''
    });

    const newTranscriber = client.realtime.transcriber({
      sampleRate: 16000
    });

    newTranscriber.on('open', () => {
      console.log('AssemblyAI WebSocket opened');
      setIsTranscribing(true);
    });

    newTranscriber.on('transcript', (transcript: RealtimeTranscript) => {
      if (transcript.text) {
        setTranscribedText(transcript.text);
        if (transcript.message_type === 'FinalTranscript') {
          handleTranscribedText(transcript.text);
        }
      }
    });

    newTranscriber.on('error', (error: Error) => {
      console.error('AssemblyAI error:', error);
      setDebug(`Transcription error: ${error.message}`);
    });

    newTranscriber.on('close', () => {
      console.log('AssemblyAI WebSocket closed');
      setIsTranscribing(false);
    });

    try {
      await newTranscriber.connect();
      return newTranscriber;
    } catch (error) {
      console.error('Failed to connect to AssemblyAI:', error);
      setDebug('Failed to connect to transcription service');
      return null;
    }
  };

  const handleTranscribedText = async (text: string) => {
    if (!avatar.current) return;
    
    setIsLoadingRepeat(true);
    try {
      await avatar.current.speak({ 
        text: text, 
        taskType: TaskType.TALK, 
        taskMode: TaskMode.SYNC 
      });
    } catch (e: any) {
      setDebug(e.message);
    }
    setIsLoadingRepeat(false);
  };

  async function requestMicrophonePermission() {
    try {
      // Ensure the context is secure
      if (!window.isSecureContext) {
        setDebug('Microphone access requires a secure context (HTTPS or localhost)');
        return false;
      }

      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDebug('Your browser does not support microphone access');
        return false;
      }

      // Check current permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('Microphone permission status:', permissionStatus.state);

      // If already denied, show a message
      if (permissionStatus.state === 'denied') {
        setDebug('Microphone access is blocked. Please allow it in your browser settings.');
        return false;
      }

      // Request permission by attempting to get the stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Stop the temporary stream if permission was granted
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      if ((error as Error).name === 'NotAllowedError') {
        setDebug('Microphone access was denied. Please allow it in your browser settings and try again.');
      } else {
        setDebug(`Microphone error: ${(error as Error).message}`);
      }
      return false;
    }
  }

  const startRecording = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && transcriber) {
          const arrayBuffer = await event.data.arrayBuffer();
          const int16Array = new Int16Array(arrayBuffer);
          transcriber.stream().write(int16Array);
        }
      };

      mediaRecorder.start(100);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      setDebug('Error starting recording: ' + (error as Error).message);
      return false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  };

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
      if (transcriber) {
        await transcriber.close();
        setTranscriber(null);
      }
      stopRecording();
    } else {
      // Check for microphone permission before switching to voice mode
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
      if (transcriber) {
        transcriber.close();
      }
      stopRecording();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  async function stopAllSessions() {
    setIsStoppingAllSessions(true);
    try {
      // First get all active sessions
      const sessionsResponse = await fetch("/api/list-sessions");
      const sessionsData = await sessionsResponse.json();
      console.log("Active sessions:", sessionsData);

      // Make sure we have the correct data structure
      const sessions = sessionsData?.data?.sessions || [];
      for (const session of sessions) {
        const closeResponse = await fetch("/api/close-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: session.session_id }),
        });
        const closeData = await closeResponse.json();
        console.log(`Session ${session.session_id} closed:`, closeData);
      }
    } catch (error) {
      console.error("Error stopping all sessions:", error);
      setDebug("Failed to stop all sessions");
    } finally {
      setIsStoppingAllSessions(false);
    }
  }

  const toggleVoiceMode = async () => {
    if (isTranscribing) {
      if (transcriber) {
        await transcriber.close();
        setTranscriber(null);
      }
      stopRecording();
      setIsTranscribing(false);
    } else {
      const newTranscriber = await initializeTranscriber();
      if (newTranscriber) {
        const started = await startRecording();
        if (started) {
          setTranscriber(newTranscriber);
        } else {
          await newTranscriber.close();
        }
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-sm font-medium leading-none">
                  Custom Knowledge ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom knowledge ID"
                  value={knowledgeId}
                  onChange={(e) => setKnowledgeId(e.target.value)}
                />
                <p className="text-sm font-medium leading-none">
                  Custom Avatar ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom avatar ID"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                />
                <Select
                  placeholder="Or select one from these example avatars"
                  size="md"
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem
                      key={avatar.avatar_id}
                      textValue={avatar.avatar_id}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start session
              </Button>
              <Button
                className="bg-gradient-to-tr from-red-500 to-red-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={stopAllSessions}
                isLoading={isStoppingAllSessions}
              >
                Stop All Active Sessions
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3 relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : (
            <div className="w-full text-center flex flex-col gap-2">
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
                onClick={toggleVoiceMode}
                isDisabled={!stream}
              >
                {isTranscribing ? "Stop Listening" : "Start Listening"}
              </Button>
              {transcribedText && (
                <p className="text-sm text-gray-600">
                  {transcribedText}
                </p>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
      <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p>
    </div>
  );
}
