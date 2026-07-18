import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Crop, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ProfilePictureUploaderProps {
  currentImage: string | null | undefined;
  onSave: (imageDataUrl: string, imageFile: Blob) => void;
  memberName: string;
  size?: 'sm' | 'md';
  extraContent?: React.ReactNode;
}

export const ProfilePictureUploader = ({ currentImage, onSave, memberName, size = 'md', extraContent }: ProfilePictureUploaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
        setIsCameraActive(false);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start camera
  const startCamera = async () => {
    setIsCameraActive(true);
    setVideoReady(false);
    setPreviewImage(null);
    setRotation(0);
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setVideoReady(false);
  };

  // Bind camera stream when camera is active and video element mounts
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const initCamera = async () => {
      if (isCameraActive && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            activeStream = stream;
            videoRef.current.onloadedmetadata = () => {
              setVideoReady(true);
            };
          }
        } catch (err) {
          alert('Unable to access camera. Please check permissions.');
          setIsCameraActive(false);
        }
      }
    };

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        context.save();
        if (rotation !== 0) {
          context.translate(width / 2, height / 2);
          context.rotate((rotation * Math.PI) / 180);
          context.translate(-width / 2, -height / 2);
        }
        context.drawImage(video, 0, 0, width, height);
        context.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            const localUrl = URL.createObjectURL(blob);
            setPreviewImage(localUrl);
            stopCamera();
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };

  // Rotate image
  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Save and crop image
  const saveImage = async () => {
    if (previewImage) {
      const img = new Image();
      img.onload = async () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          canvas.width = 400;
          canvas.height = 400;

          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(img, x, y, size, size, 0, 0, 400, 400);
            canvas.toBlob((blob) => {
              if (blob) {
                const localUrl = URL.createObjectURL(blob);
                onSave(localUrl, blob);
                setIsOpen(false);
                setPreviewImage(null);
                setRotation(0);
              }
            }, 'image/jpeg', 0.85);
          }
        }
      };
      img.src = previewImage;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <>
      {/* Profile Picture Display */}
      <div className={`flex flex-col items-center text-center ${size === 'sm' ? 'gap-1 mb-2' : 'gap-4 mb-6'}`}>
        <div className="relative group">
          <img
            src={currentImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=ffd700&color=001a16&size=200`}
            alt={memberName}
            className={`${size === 'sm' ? 'w-20 h-20 md:w-24 md:h-24' : 'w-32 h-32 md:w-40 md:h-40'} rounded-full border-4 border-[#ffd700] object-cover`}
          />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="Edit profile picture"
            aria-label="Edit profile picture"
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className="w-6 h-6 text-[#ffd700]" />
          </button>
        </div>
        <p className="text-gray-400 text-xs">Click photo to change</p>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#ffd700]">Update Profile Picture</h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  stopCamera();
                  setPreviewImage(null);
                  setRotation(0);
                }}
                title="Close"
                aria-label="Close dialog"
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!previewImage && !isCameraActive && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#001a16] border-2 border-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] font-semibold py-4 rounded transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-8 h-8" />
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-[#001a16] border-2 border-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] font-semibold py-4 rounded transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-8 h-8" />
                    Take Photo
                  </button>
                </div>
                {extraContent && (
                  <>
                    <div className="border-t border-white/10 my-4" />
                    {extraContent}
                  </>
                )}
              </>
            )}

            {/* Camera Stream */}
            {isCameraActive && (
              <div className="mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full bg-black rounded aspect-square object-cover"
                />
                <p className="mt-2 text-sm text-gray-300">
                  {videoReady ? 'Camera is ready. Tap Capture to snap your picture.' : 'Preparing camera...'}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={capturePhoto}
                    disabled={!videoReady}
                    className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex-1 border-[#ffd700] text-[#ffd700]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {previewImage && (
              <div className="mb-6">
                <div className="relative bg-[#001a16] rounded overflow-hidden aspect-square mb-4">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className={`w-full h-full object-cover transition-transform ${rotation === 90 ? 'rotate-90' : rotation === 180 ? 'rotate-180' : rotation === 270 ? 'rotate-270' : 'rotate-0'}`}
                  />
                  {/* Crop circle overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 rounded-full border-2 border-dashed border-[#ffd700]/50" />
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={rotateImage}
                    variant="outline"
                    className="flex-1 border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotate
                  </Button>
                  <Button
                    onClick={() => {
                      setPreviewImage(null);
                      setRotation(0);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    Change
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveImage}
                    className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Save Picture
                  </Button>
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      setPreviewImage(null);
                      setRotation(0);
                    }}
                    variant="outline"
                    className="flex-1 border-[#ffd700] text-[#ffd700]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              aria-label="Select image file"
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
          </Card>
        </div>
      )}
    </>
  );
};
