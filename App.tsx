import React, { useState, useCallback, useEffect } from 'react';
import type { RenderHistoryItem, SourceImage, EditHistoryItem } from './types';
import { generateImages, upscaleImage, describeInteriorImage } from './services/geminiService';
import { Icon } from './components/icons';
import { ImageEditor } from './components/ImageEditor';
import { UtilitiesTab } from './components/UtilitiesTab';
import { VirtualTourTab } from './components/VirtualTourTab';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/25 p-6 rounded-xl">
    <h2 className="text-lg font-semibold text-slate-300 mb-4">{title}</h2>
    {children}
  </div>
);

const ImageUpload: React.FC<{
  sourceImage: SourceImage | null;
  onImageUpload: (image: SourceImage) => void;
  onRemove: () => void;
}> = ({ sourceImage, onImageUpload, onRemove }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            if (base64) {
              onImageUpload({ base64, mimeType: file.type });
            }
        };
        reader.readAsDataURL(file);
    } else {
        alert("Vui lòng tải lên một tệp ảnh hợp lệ (PNG, JPG, WEBP).");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent the file dialog from opening
      onRemove();
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed rounded-lg p-4 flex items-center justify-center h-48 mb-4 hover:border-indigo-500 transition-colors cursor-pointer ${isDraggingOver ? 'border-indigo-500 bg-slate-700/50' : 'border-slate-600'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {sourceImage ? (
          <>
            <img src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`} alt="Source" className="max-h-full max-w-full object-contain rounded" />
            <button
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-black/50 rounded-full text-white hover:bg-black/80 p-0.5 transition-colors opacity-0 group-hover:opacity-100 z-10"
                aria-label="Remove source image"
            >
                <Icon name="x-circle" className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="text-center text-slate-400 pointer-events-none">
            <p>Nhấp hoặc kéo tệp vào đây</p>
            <p className="text-xs">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
      >
        {sourceImage ? 'Đổi Ảnh Khác' : 'Tải Lên Ảnh'}
      </button>
    </div>
  );
};

const ReferenceImageUpload: React.FC<{
  image: SourceImage | null;
  onUpload: (image: SourceImage) => void;
  onRemove: () => void;
}> = ({ image, onUpload, onRemove }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            if (base64) {
              onUpload({ base64, mimeType: file.type });
            }
        };
        reader.readAsDataURL(file);
    } else {
        alert("Vui lòng tải lên một tệp ảnh hợp lệ (PNG, JPG, WEBP).");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (image) {
    return (
      <div className="relative group">
        <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Reference" className="w-full h-56 object-cover rounded-md" />
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 bg-black/50 rounded-full text-white hover:bg-black/80 p-0.5 transition-colors opacity-0 group-hover:opacity-100 z-10"
          aria-label="Remove reference image"
        >
          <Icon name="x-circle" className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full border-2 border-dashed rounded-lg p-4 flex items-center justify-center h-56 text-center text-slate-400 text-sm hover:border-indigo-500 transition-colors ${isDraggingOver ? 'border-indigo-500 bg-slate-700/50' : 'border-slate-600'}`}
      >
        + Thêm ảnh tham khảo (Tone/Mood)
      </button>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
    </>
  );
};

const ResultDisplay: React.FC<{
  images: string[];
  isLoading: boolean;
  onUpscale: (index: number, target: '2k' | '4k') => void;
  upscalingIndex: number | null;
  onEditRequest: (image: string) => void;
  selectedImageIndex: number;
  onSelectImageIndex: (index: number) => void;
  onChangeAngle: (index: number) => void;
  onFullscreen: (index: number) => void;
  showChangeAngleButton: boolean;
}> = ({ images, isLoading, onUpscale, upscalingIndex, onEditRequest, selectedImageIndex, onSelectImageIndex, onChangeAngle, onFullscreen, showChangeAngleButton }) => {
  const selectedImage = images[selectedImageIndex];

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/25 p-6 rounded-xl h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300">Kết Quả Render</h2>
        {images.length > 0 && <span className="text-sm text-slate-400">{images.length} ảnh</span>}
      </div>

      {/* Main Preview */}
      <div className="flex-grow flex items-center justify-center bg-black/20 rounded-lg mb-4 min-h-[300px] md:min-h-[400px]">
        {isLoading ? (
          <div className="w-full h-full bg-slate-700/50 rounded-lg animate-pulse"></div>
        ) : selectedImage ? (
          <div className="relative group w-full h-full flex items-center justify-center">
            <img src={selectedImage} alt={`Rendered result ${selectedImageIndex + 1}`} className="max-w-full max-h-full object-contain rounded-md" />
            
            {upscalingIndex === selectedImageIndex && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center rounded-lg z-20">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-100"></div>
                <p className="mt-3 font-semibold text-sm text-slate-200">Đang upscale...</p>
              </div>
            )}
            
            {upscalingIndex === null && (
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <button
                  onClick={() => onFullscreen(selectedImageIndex)}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                  title="Xem Toàn Màn Hình"
                >
                  <Icon name="arrows-expand" className="w-4 h-4" />
                  <span>Phóng To</span>
                </button>
                <button
                  onClick={() => onEditRequest(selectedImage)}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                  title="Chỉnh Sửa Ảnh Này"
                >
                  <Icon name="pencil" className="w-4 h-4" />
                  <span>Sửa</span>
                </button>
                {showChangeAngleButton && (
                  <button
                    onClick={() => onChangeAngle(selectedImageIndex)}
                    className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                    title="Đổi Góc Chụp Ảnh Này"
                  >
                    <Icon name="viewfinder" className="w-4 h-4" />
                    <span>Góc Chụp</span>
                  </button>
                )}
                <a
                  href={selectedImage}
                  download={`nbox-ai-render-${Date.now()}-${selectedImageIndex}.png`}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                  aria-label="Tải ảnh"
                  title="Tải ảnh"
                >
                  <Icon name="download" className="w-4 h-4" />
                  <span>Tải</span>
                </a>
              </div>
            )}

            {upscalingIndex === null && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <button
                  onClick={() => onUpscale(selectedImageIndex, '2k')}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white font-bold text-xs px-2 py-1 rounded-md transition-colors"
                  title="Upscale lên 2K"
                >
                  UPSCALE 2K
                </button>
                <button
                  onClick={() => onUpscale(selectedImageIndex, '4k')}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white font-bold text-xs px-2 py-1 rounded-md transition-colors"
                  title="Upscale lên 4K"
                >
                  UPSCALE 4K
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <p>Hình ảnh được tạo sẽ xuất hiện ở đây.</p>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-square bg-slate-700/50 rounded-lg animate-pulse"></div>
          ))
        ) : (
          images.map((image, index) => (
            <div
              key={index}
              className={`relative group aspect-square bg-slate-700 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${selectedImageIndex === index ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-indigo-500' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => onSelectImageIndex(index)}
            >
              <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};


const HistoryPanel: React.FC<{ 
    history: RenderHistoryItem[]; 
    onClear: () => void; 
    onSelect: (item: RenderHistoryItem) => void;
    title: string;
}> = ({ history, onClear, onSelect, title }) => {
  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/25 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
          <Icon name="clock" className="w-5 h-5" />
          {title}
        </h2>
        {history.length > 0 &&
            <button onClick={onClear} className="text-red-400 hover:text-red-500 text-sm font-semibold flex items-center gap-1">
                <Icon name="trash" className="w-4 h-4" />
                Xóa
            </button>
        }
      </div>
      {history.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto max-h-96">
          {history.map((item) => (
            <li key={item.id} 
                className="flex items-center gap-4 bg-slate-700/50 p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors"
                onClick={() => onSelect(item)}
            >
              <img src={item.images[0]} alt="History thumbnail" className="w-12 h-12 object-cover rounded" />
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm">{item.images.length} ảnh</p>
                <p className="text-xs text-slate-400 truncate" title={item.prompt}>{item.prompt}</p>
              </div>
              <p className="text-xs text-slate-500 self-start">{item.timestamp}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Chưa có lịch sử render.</p>
      )}
    </div>
  );
};

const EditHistoryPanel: React.FC<{ 
    history: EditHistoryItem[]; 
    onClear: () => void; 
    onSelect: (item: EditHistoryItem) => void;
}> = ({ history, onClear, onSelect }) => {
  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/25 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
          <Icon name="clock" className="w-5 h-5" />
          Lịch Sử Chỉnh Sửa
        </h2>
        {history.length > 0 &&
            <button onClick={onClear} className="text-red-400 hover:text-red-500 text-sm font-semibold flex items-center gap-1">
                <Icon name="trash" className="w-4 h-4" />
                Xóa
            </button>
        }
      </div>
      {history.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {history.map((item) => (
            <li key={item.id} 
                className="flex items-center gap-4 bg-slate-700/50 p-2 rounded-md hover:bg-slate-700 cursor-pointer transition-colors"
                onClick={() => onSelect(item)}
            >
              <img src={item.resultImage} alt="History thumbnail" className="w-12 h-12 object-cover rounded" />
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm truncate" title={item.prompt}>{item.prompt}</p>
                <p className="text-xs text-slate-400">1 ảnh đã sửa</p>
              </div>
              <p className="text-xs text-slate-500 self-start flex-shrink-0">{item.timestamp}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Chưa có lịch sử chỉnh sửa.</p>
      )}
    </div>
  );
};

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void; }> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-transform duration-200 hover:scale-110 z-10"
          aria-label="Close"
        >
          <Icon name="x-mark" className="w-6 h-6" />
        </button>
        <div className="p-2 flex-grow overflow-auto flex items-center justify-center">
            <img src={imageUrl} alt="Fullscreen view" className="max-w-full max-h-full object-contain rounded-md" />
        </div>
      </div>
    </div>
  );
};

const UpscaleModal: React.FC<{ imageUrl: string; onClose: () => void; }> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-transform duration-200 hover:scale-110 z-10"
          aria-label="Close"
        >
          <Icon name="x-mark" className="w-6 h-6" />
        </button>
        <div className="p-4 overflow-auto">
            <img src={imageUrl} alt="Upscaled result" className="w-full h-auto object-contain rounded-md" />
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-center">
          <a
            href={imageUrl}
            download={`nbox-ai-upscaled-${Date.now()}.png`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="download" className="w-5 h-5" />
            Tải Về Ảnh Upscaled
          </a>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, icon, isActive, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? 'border-indigo-500 text-white bg-slate-800/60'
          : disabled
          ? 'border-transparent text-slate-600 cursor-not-allowed'
          : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
      }`}
    >
      <Icon name={icon} className="w-5 h-5" />
      {label}
      {disabled && <Icon name="lock-closed" className="w-4 h-4 ml-1" />}
    </button>
  );
};


export default function App() {
  const [activeTab, setActiveTab] = useState<'exterior' | 'interior' | 'floorplan' | 'edit' | 'utilities' | 'virtual-tour'>('exterior');
  const [imageForEditing, setImageForEditing] = useState<SourceImage | null>(null);
  const [editHistoryItemToRestore, setEditHistoryItemToRestore] = useState<EditHistoryItem | null>(null);

  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<SourceImage | null>(null);
  
  // Exterior prompts
  const [exteriorPrompt, setExteriorPrompt] = useState('a modern one-story house, photorealistic, cinematic lighting, 8k');
  const exteriorPredefinedPrompts = [
      "Ảnh chụp thực tế công trình tại đường phố Việt Nam, trời buổi trưa có nắng gắt",
      "Ảnh chụp thực tế công trình tại ngã 3 đường phố sầm uất tại Thành Phố Hồ Chí Minh, trời ban ngày vừa tạnh mưa",
      "Ảnh chụp thực tế công trình tại khu villa giàu có ở Việt Nam, trời ban ngày vừa tạnh mưa",
      "Ảnh chụp thực tế công trình tại khu đồng quê ở Việt Nam, trời buổi chiều có nắng vàng"
  ];

  // Interior prompts
  const [interiorPrompt, setInteriorPrompt] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const interiorPredefinedPrompts = [
    "tạo ảnh chụp thực tế phòng khách phong cách hiện đại với ghế sofa màu xám, sàn gỗ, và cửa sổ lớn nhìn ra vườn",
    "tạo ảnh chụp thực tế phòng ngủ ấm cúng với tông màu trung tính, giường gỗ, và ánh sáng vàng dịu",
    "tạo ảnh chụp thực tế nhà bếp tối giản với tủ bếp trắng không tay cầm, mặt bếp đá cẩm thạch, và đèn thả trần",
    "tạo ảnh chụp thực tế phòng tắm sang trọng ốp đá marble, có bồn tắm đứng và vòi sen cây, ánh sáng tự nhiên",
    "tạo ảnh chụp thực tế văn phòng làm việc tại nhà với bàn gỗ sồi, ghế công thái học, và kệ sách âm tường"
  ];
  
  // Floorplan state
  const [floorplanPrompt, setFloorplanPrompt] = useState('Biến bản floorplan này thành ảnh render 3d nội thất.');
  const [roomType, setRoomType] = useState('Phòng khách');
  const [roomStyle, setRoomStyle] = useState('Hiện đại');
  const roomTypeOptions = ['Phòng khách', 'Phòng ngủ', 'Nhà bếp', 'Phòng tắm / WC', 'Ban công', 'Phòng làm việc', 'Phòng ăn', 'Lối vào'];
  const roomStyleOptions = ['Hiện đại', 'Tân cổ điển', 'Wabi-sabi', 'Tối giản (Minimalism)', 'Scanvadian', 'Indochine', 'Industrial', 'Bohemian'];

  const exteriorAngleOptions = [
    "Góc chụp trực diện toàn cảnh mặt tiền căn nhà",
    "Góc chụp 3/4 bên trái, thể hiện cả mặt tiền và hông nhà",
    "Góc chụp 3/4 bên phải, lấy được chiều sâu công trình",
    "Góc chụp từ trên cao nhìn xuống (drone view) toàn cảnh khuôn viên",
    "Góc chụp từ dưới lên (low angle), nhấn mạnh chiều cao và sự bề thế",
    "Góc chụp cận cảnh chi tiết cửa chính và vật liệu mặt tiền",
    "Góc chụp xuyên qua hàng cây/cảnh quan để tạo khung tự nhiên",
    "Góc chụp từ trong nhà nhìn ra sân vườn hoặc cổng",
    "Góc chụp ban đêm với ánh sáng nhân tạo, nhấn mạnh hệ thống đèn",
    "Góc chụp panorama quét ngang, bao trọn bối cảnh và môi trường xung quanh",
  ];

  const interiorAngleOptions = [
    "Ảnh chụp thực tế từ trên cao nhìn xuống toàn bộ không gian phòng",
    "Ảnh chụp thực tế góc 3/4 bên trái bao quát cả căn phòng",
    "Ảnh chụp thực tế góc 3/4 bên phải bao quát cả căn phòng",
    "Ảnh chụp thực tế góc chính diện thẳng vào trung tâm phòng",
    "Ảnh chụp thực tế góc chéo từ cửa ra vào nhìn vào trong phòng",
    "Ảnh chụp thực tế góc chụp từ phía sau sofa nhìn về hướng cửa sổ",
    "Ảnh chụp thực tế góc chụp từ trong phòng nhìn ngược ra cửa chính",
    "Ảnh chụp thực tế góc chụp từ trần nhà thấp xuống tạo chiều sâu không gian",
    "Ảnh chụp thực tế góc chụp đối xứng cân bằng toàn bộ phòng",
    "Ảnh chụp thực tế góc chụp từ một góc tường chéo tạo cảm giác rộng",
    "Ảnh chụp thực tế khu vực sofa và bàn trà từ góc nhìn ngang",
    "Ảnh chụp thực tế khu vực kệ tivi và tường trang trí từ góc chính diện",
    "Ảnh chụp thực tế bàn ăn và ghế từ góc nghiêng 45 độ",
    "Ảnh chụp thực tế cửa sổ lớn và ánh sáng tự nhiên tràn vào phòng",
    "Ảnh chụp thực tế góc tường trang trí với tranh nghệ thuật và đèn hắt sáng",
    "Ảnh chụp thực tế góc nhìn về khu vực bếp liên thông với phòng khách",
    "Ảnh chụp thực tế góc chụp khu vực đọc sách với kệ sách và ghế đơn",
    "Ảnh chụp thực tế góc chụp thảm trải sàn bao quanh bàn trà",
    "Ảnh chụp thực tế góc chụp khu vực treo rèm cửa và ánh sáng chiếu vào",
    "Ảnh chụp thực tế góc chụp chi tiết trần nhà và hệ thống đèn trang trí",
    "Ảnh chụp thực tế cận cảnh sofa với chất liệu vải hoặc da",
    "Ảnh chụp thực tế cận cảnh bàn trà với mặt kính hoặc gỗ",
    "Ảnh chụp thực tế cận cảnh đèn chùm pha lê hoặc đèn thả trần",
    "Ảnh chụp thực tế cận cảnh gối trang trí nhiều màu sắc trên sofa",
    "Ảnh chụp thực tế cận cảnh thảm trải sàn với hoa văn rõ nét",
    "Ảnh chụp thực tế cận cảnh rèm cửa với chất liệu mỏng nhẹ",
    "Ảnh chụp thực tế cận cảnh chậu cây xanh trang trí trong phòng",
    "Ảnh chụp thực tế cận cảnh kệ tivi và đồ trang trí nhỏ",
    "Ảnh chụp thực tế cận cảnh tay vịn ghế và chất liệu gỗ",
    "Ảnh chụp thực tế cận cảnh bề mặt tường với hoa văn hoặc phào chỉ",
  ];

  const angleOptions = activeTab === 'interior' ? interiorAngleOptions : exteriorAngleOptions;
  const [anglePrompt, setAnglePrompt] = useState(angleOptions[0]);
  const angleSectionRef = React.useRef<HTMLDivElement>(null);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const [exteriorHistory, setExteriorHistory] = useState<RenderHistoryItem[]>([]);
  const [interiorHistory, setInteriorHistory] = useState<RenderHistoryItem[]>([]);
  const [floorplanHistory, setFloorplanHistory] = useState<RenderHistoryItem[]>([]);
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [upscalingIndex, setUpscalingIndex] = useState<number | null>(null);
  const [upscaledImageForModal, setUpscaledImageForModal] = useState<string | null>(null);
  const [imageForFullscreen, setImageForFullscreen] = useState<string | null>(null);

  const featuresLocked = false;


  useEffect(() => {
    try {
      const storedExteriorHistory = localStorage.getItem('exteriorRenderHistory');
      if (storedExteriorHistory) setExteriorHistory(JSON.parse(storedExteriorHistory));

      const storedInteriorHistory = localStorage.getItem('interiorRenderHistory');
      if (storedInteriorHistory) setInteriorHistory(JSON.parse(storedInteriorHistory));

      const storedFloorplanHistory = localStorage.getItem('floorplanHistory');
      if (storedFloorplanHistory) setFloorplanHistory(JSON.parse(storedFloorplanHistory));

      const storedEditHistory = localStorage.getItem('editHistory');
      if (storedEditHistory) setEditHistory(JSON.parse(storedEditHistory));

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('exteriorRenderHistory', JSON.stringify(exteriorHistory));
    } catch (error) {
        console.error("Failed to save exterior render history to localStorage", error);
    }
  }, [exteriorHistory]);

  useEffect(() => {
    try {
        localStorage.setItem('interiorRenderHistory', JSON.stringify(interiorHistory));
    } catch (error) {
        console.error("Failed to save interior render history to localStorage", error);
    }
  }, [interiorHistory]);
  
  useEffect(() => {
    try {
        localStorage.setItem('floorplanHistory', JSON.stringify(floorplanHistory));
    } catch (error) {
        console.error("Failed to save floorplan history to localStorage", error);
    }
  }, [floorplanHistory]);

  useEffect(() => {
    try {
        localStorage.setItem('editHistory', JSON.stringify(editHistory));
    } catch (error) {
        console.error("Failed to save edit history to localStorage", error);
    }
  }, [editHistory]);

  // Update anglePrompt when switching tabs
  useEffect(() => {
    if (activeTab === 'exterior' || activeTab === 'interior') {
      const newAngleOptions = activeTab === 'interior' ? interiorAngleOptions : exteriorAngleOptions;
      setAnglePrompt(newAngleOptions[0]);
    }
  }, [activeTab]);

  // Automatically update the floorplan prompt when room type or style changes
  useEffect(() => {
    if (activeTab === 'floorplan') {
        const basePrompt = 'Biến bản floorplan này thành ảnh render 3d nội thất';
        setFloorplanPrompt(`${basePrompt}. Loại phòng: ${roomType}. Phong cách: ${roomStyle}.`);
    }
  }, [roomType, roomStyle, activeTab]);

  const handleImageUpload = async (image: SourceImage) => {
    setSourceImage(image);
    if (activeTab === 'interior') {
        setIsGeneratingDesc(true);
        setInteriorPrompt('');
        try {
            const description = await describeInteriorImage(image);
            setInteriorPrompt(`tạo ảnh chụp thực tế ${description}`);
        } catch (error) {
            console.error("Failed to describe image:", error);
            alert("Không thể tự động tạo mô tả cho ảnh. Vui lòng nhập mô tả thủ công.");
        } finally {
            setIsGeneratingDesc(false);
        }
    }
  };

  const handleGeneration = useCallback(async (prompt: string, renderType: 'exterior' | 'interior', isAnglePrompt: boolean) => {
    if (!sourceImage || !prompt) {
      alert("Vui lòng tải lên ảnh nguồn và nhập prompt.");
      return;
    }
    setIsLoading(true);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    try {
      const refImage = isAnglePrompt ? null : referenceImage;
      const images = await generateImages(sourceImage, prompt, renderType, 4, refImage, isAnglePrompt);
      setGeneratedImages(images);
      
      const newHistoryItem: RenderHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        images: images,
        prompt: prompt,
      };
      const historySetter = renderType === 'exterior' ? setExteriorHistory : setInteriorHistory;
      historySetter(prev => [newHistoryItem, ...prev]);

    } catch (error) {
      console.error("Image generation failed:", error);
      alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra API key và thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage, referenceImage]);

  const handleFloorplanGeneration = useCallback(async () => {
    if (!sourceImage) {
      alert("Vui lòng tải lên ảnh floorplan.");
      return;
    }
    const finalPrompt = floorplanPrompt;
    
    setIsLoading(true);
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    try {
      const images = await generateImages(sourceImage, finalPrompt, 'floorplan', 4, null, false);
      setGeneratedImages(images);
      
      const newHistoryItem: RenderHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        images: images,
        prompt: finalPrompt,
      };
      setFloorplanHistory(prev => [newHistoryItem, ...prev]);

    } catch (error) {
      console.error("Floorplan generation failed:", error);
      alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra API key và thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, [sourceImage, floorplanPrompt]);
  
  const dataUrlToSourceImage = (dataUrl: string): SourceImage | null => {
    const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match && match[1] && match[2]) {
        return { mimeType: match[1], base64: match[2] };
    }
    return null;
  }

  const handleUpscale = async (index: number, target: '2k' | '4k') => {
      const sourceDataUrl = generatedImages[index];
      if (!sourceDataUrl) return;

      const imageToUpscale = dataUrlToSourceImage(sourceDataUrl);
      if (!imageToUpscale) {
          alert("Định dạng ảnh không hợp lệ để upscale.");
          return;
      }

      setUpscalingIndex(index);
      try {
          const upscaledImage = await upscaleImage(imageToUpscale, target);
          if (upscaledImage) {
              const newGeneratedImages = [...generatedImages];
              newGeneratedImages[index] = upscaledImage;
              setGeneratedImages(newGeneratedImages);
              setUpscaledImageForModal(upscaledImage);
              
              const historyUpdaters = [setExteriorHistory, setInteriorHistory, setFloorplanHistory];
              historyUpdaters.forEach(setter => {
                  setter(prev => {
                      const newHistory = [...prev];
                      const historyItemIndex = newHistory.findIndex(item => item.images.includes(sourceDataUrl));
                      if (historyItemIndex > -1) {
                          const latestItem = { ...newHistory[historyItemIndex] };
                          const imageIndexInHistory = latestItem.images.findIndex(img => img === sourceDataUrl);
                          if (imageIndexInHistory > -1) {
                            const newImages = [...latestItem.images];
                            newImages[imageIndexInHistory] = upscaledImage;
                            latestItem.images = newImages;
                            newHistory[historyItemIndex] = latestItem;
                          }
                      }
                      return newHistory;
                  });
              });

          } else {
              throw new Error("Upscaling returned no image.");
          }
      } catch (error) {
          console.error(`Upscaling to ${target} failed:`, error);
          alert(`Đã xảy ra lỗi khi upscale ảnh lên ${target.toUpperCase()}. Vui lòng thử lại.`);
      } finally {
          setUpscalingIndex(null);
      }
  };

  const clearRenderHistory = (type: 'exterior' | 'interior' | 'floorplan') => {
    const typeName = {
        exterior: 'ngoại thất',
        interior: 'nội thất',
        floorplan: 'floorplan 3D'
    }[type];
    if(window.confirm(`Bạn có chắc muốn xóa toàn bộ lịch sử render ${typeName}?`)) {
        if (type === 'exterior') setExteriorHistory([]);
        else if (type === 'interior') setInteriorHistory([]);
        else if (type === 'floorplan') setFloorplanHistory([]);
    }
  }
  
  const handleSelectRenderHistoryItem = (item: RenderHistoryItem, type: 'exterior' | 'interior' | 'floorplan') => {
      if (featuresLocked && (type === 'interior' || type === 'floorplan')) {
        alert("Tính năng này đang được bảo trì, vui lòng quay lại sau.");
        return;
      }
      setGeneratedImages(item.images);
      setSelectedImageIndex(0);
      setActiveTab(type);
  }

  const handleEditRequest = (imageUrl: string) => {
      if (featuresLocked) {
        alert("Tính năng này đang được bảo trì, vui lòng quay lại sau.");
        return;
      }
      const imageToEdit = dataUrlToSourceImage(imageUrl);
      if (imageToEdit) {
          setImageForEditing(imageToEdit);
          setActiveTab('edit');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleChangeAngle = (index: number) => {
    const imageUrl = generatedImages[index];
    if (!imageUrl) return;
    
    const imageToUse = dataUrlToSourceImage(imageUrl);
    if (imageToUse) {
        setSourceImage(imageToUse);
        setReferenceImage(null); // Clear reference image as it's not relevant for angle change of a finished render
        angleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFullscreen = (index: number) => {
    const imageUrl = generatedImages[index];
    if (imageUrl) {
        setImageForFullscreen(imageUrl);
    }
  };

  const handleEditComplete = (details: Omit<EditHistoryItem, 'id' | 'timestamp'>) => {
    const newHistoryItem: EditHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        ...details
    };
    setEditHistory(prev => [newHistoryItem, ...prev]);
  };

  const clearEditHistory = () => {
    if(window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử chỉnh sửa?")) {
        setEditHistory([]);
    }
  };

  const handleSelectEditHistoryItem = (item: EditHistoryItem) => {
    if (featuresLocked) {
        alert("Tính năng này đang được bảo trì, vui lòng quay lại sau.");
        return;
    }
    setEditHistoryItemToRestore(item);
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handlePredefinedPromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPrompt = event.target.value;
    if (selectedPrompt) {
      if (activeTab === 'exterior') setExteriorPrompt(selectedPrompt);
      else setInteriorPrompt(selectedPrompt);
    }
  };

  const handleAnglePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAngle = event.target.value;
    if (selectedAngle) {
        setAnglePrompt(selectedAngle);
    }
  };

  const isBusy = isLoading || upscalingIndex !== null;
  const selectCommonStyles = "w-full bg-slate-700 p-3 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none";

  return (
    <div className="min-h-screen p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-slate-100 uppercase font-anton">
          AI TOOLS <span className="text-amber-400">ARCHITECTURE - MRT</span>
        </h1>
        <p className="text-sm text-slate-400 mt-3 tracking-widest">© Bản quyền thuộc về Phúc Anh MRT</p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex border-b border-slate-700 mb-8 overflow-x-auto">
          <TabButton
            label="Render Ngoại Thất"
            icon="building"
            isActive={activeTab === 'exterior'}
            onClick={() => setActiveTab('exterior')}
          />
          <TabButton
            label="Render Nội Thất"
            icon="home"
            isActive={activeTab === 'interior'}
            onClick={() => setActiveTab('interior')}
            disabled={featuresLocked}
          />
           <TabButton
            label="Floorplan to 3D"
            icon="floorplan"
            isActive={activeTab === 'floorplan'}
            onClick={() => setActiveTab('floorplan')}
            disabled={featuresLocked}
          />
          <TabButton
            label="Tham quan ảo"
            icon="viewfinder"
            isActive={activeTab === 'virtual-tour'}
            onClick={() => setActiveTab('virtual-tour')}
          />
          <TabButton
            label="Chỉnh Sửa Ảnh"
            icon="brush"
            isActive={activeTab === 'edit'}
            onClick={() => setActiveTab('edit')}
            disabled={featuresLocked}
          />
          <TabButton
            label="Tiện Ích Khác"
            icon="sparkles"
            isActive={activeTab === 'utilities'}
            onClick={() => setActiveTab('utilities')}
          />
        </div>

        <main>
          {(activeTab === 'exterior' || activeTab === 'interior') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                <Section title={`1. Tải Lên Ảnh ${activeTab === 'exterior' ? 'Ngoại Thất' : 'Nội Thất'}`}>
                  <ImageUpload 
                      sourceImage={sourceImage} 
                      onImageUpload={handleImageUpload} 
                      onRemove={() => { setSourceImage(null); setReferenceImage(null); }}
                  />
                </Section>

                <Section title="2. Mô Tả">
                    <div className="space-y-4">
                        <ReferenceImageUpload 
                        image={referenceImage}
                        onUpload={setReferenceImage}
                        onRemove={() => setReferenceImage(null)}
                        />
                        <div className="relative">
                            <textarea
                                value={activeTab === 'exterior' ? exteriorPrompt : interiorPrompt}
                                onChange={(e) => {
                                    if(activeTab === 'exterior') setExteriorPrompt(e.target.value);
                                    else setInteriorPrompt(e.target.value);
                                }}
                                placeholder={activeTab === 'exterior' ? "Ví dụ: một ngôi nhà hiện đại, ánh sáng ban ngày, ảnh thực tế..." : "AI sẽ tự động điền mô tả ảnh của bạn vào đây..."}
                                className="w-full bg-slate-700 p-2 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                readOnly={activeTab === 'interior' && isGeneratingDesc}
                            />
                            {isGeneratingDesc && (
                                <div className="absolute inset-0 bg-slate-700/80 flex items-center justify-center rounded-md">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-100"></div>
                                </div>
                            )}
                        </div>
                        <select
                        onChange={handlePredefinedPromptChange}
                        value=""
                        className={selectCommonStyles}
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em',
                            paddingRight: '2.5rem',
                        }}
                        >
                        <option value="" disabled>Hoặc chọn một prompt có sẵn</option>
                        {(activeTab === 'exterior' ? exteriorPredefinedPrompts : interiorPredefinedPrompts).map(prompt => (
                            <option key={prompt} value={prompt}>{prompt}</option>
                        ))}
                        </select>
                        <button
                        onClick={() => handleGeneration(activeTab === 'exterior' ? exteriorPrompt : interiorPrompt, activeTab, false)}
                        disabled={isBusy || !sourceImage}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                        <Icon name="sparkles" className="w-5 h-5" />
                        Tạo Ảnh Thực Tế
                        </button>
                    </div>
                </Section>
                
                <div ref={angleSectionRef}>
                  <Section title="3. Đổi Góc Chụp">
                    <div className="space-y-4">
                        <textarea
                            value={anglePrompt}
                            onChange={(e) => setAnglePrompt(e.target.value)}
                            placeholder="Ví dụ: Góc chụp từ dưới lên (low angle), nhấn mạnh chiều cao và sự bề thế"
                            className="w-full bg-slate-700 p-2 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <select
                        onChange={handleAnglePresetChange}
                        value=""
                        className={selectCommonStyles}
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em',
                            paddingRight: '2.5rem',
                        }}
                        >
                        <option value="" disabled>Hoặc chọn một góc chụp có sẵn</option>
                        {angleOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                        </select>
                        <button
                          onClick={() => handleGeneration(anglePrompt, activeTab, true)}
                          disabled={isBusy || !sourceImage}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                        <Icon name="sparkles" className="w-5 h-5" />
                        Tạo Góc Chụp Mới
                        </button>
                    </div>
                  </Section>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                <ResultDisplay 
                  images={generatedImages} 
                  isLoading={isLoading}
                  onUpscale={handleUpscale}
                  upscalingIndex={upscalingIndex}
                  onEditRequest={handleEditRequest}
                  selectedImageIndex={selectedImageIndex}
                  onSelectImageIndex={setSelectedImageIndex}
                  onChangeAngle={handleChangeAngle}
                  onFullscreen={handleFullscreen}
                  showChangeAngleButton={true}
                />
                {activeTab === 'exterior' ? (
                    <HistoryPanel 
                        title="Lịch Sử Render Ngoại Thất"
                        history={exteriorHistory} 
                        onClear={() => clearRenderHistory('exterior')} 
                        onSelect={(item) => handleSelectRenderHistoryItem(item, 'exterior')}
                    />
                ) : (
                    <HistoryPanel 
                        title="Lịch Sử Render Nội Thất"
                        history={interiorHistory} 
                        onClear={() => clearRenderHistory('interior')} 
                        onSelect={(item) => handleSelectRenderHistoryItem(item, 'interior')}
                    />
                )}
              </div>
            </div>
          )}

          {activeTab === 'floorplan' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                <Section title="1. Tải Lên Floorplan">
                  <ImageUpload 
                      sourceImage={sourceImage} 
                      onImageUpload={handleImageUpload} 
                      onRemove={() => setSourceImage(null)}
                  />
                </Section>
                <Section title="2. Tùy Chọn & Mô Tả">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Loại phòng</label>
                                <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={selectCommonStyles} >
                                    {roomTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Phong cách</label>
                                <select value={roomStyle} onChange={(e) => setRoomStyle(e.target.value)} className={selectCommonStyles}>
                                    {roomStyleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <textarea
                            value={floorplanPrompt}
                            onChange={(e) => setFloorplanPrompt(e.target.value)}
                            className="w-full bg-slate-700 p-2 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                            onClick={handleFloorplanGeneration}
                            disabled={isBusy || !sourceImage}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            <Icon name="sparkles" className="w-5 h-5" />
                            Tạo Ảnh 3D
                        </button>
                    </div>
                </Section>
              </div>
               {/* Right Column */}
               <div className="lg:col-span-2 flex flex-col gap-8">
                <ResultDisplay 
                  images={generatedImages} 
                  isLoading={isLoading}
                  onUpscale={handleUpscale}
                  upscalingIndex={upscalingIndex}
                  onEditRequest={handleEditRequest}
                  selectedImageIndex={selectedImageIndex}
                  onSelectImageIndex={setSelectedImageIndex}
                  onChangeAngle={handleChangeAngle}
                  onFullscreen={handleFullscreen}
                  showChangeAngleButton={false}
                />
                <HistoryPanel 
                    title="Lịch Sử Floorplan 3D"
                    history={floorplanHistory} 
                    onClear={() => clearRenderHistory('floorplan')} 
                    onSelect={(item) => handleSelectRenderHistoryItem(item, 'floorplan')}
                />
              </div>
            </div>
          )}

          {activeTab === 'virtual-tour' && (
            <VirtualTourTab />
          )}

          {activeTab === 'edit' && (
             <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <ImageEditor 
                        initialImage={imageForEditing} 
                        onClearInitialImage={() => setImageForEditing(null)}
                        onEditComplete={handleEditComplete}
                        historyItemToRestore={editHistoryItemToRestore}
                        onHistoryRestored={() => setEditHistoryItemToRestore(null)}
                    />
                </div>
                <div className="lg:col-span-1">
                    <EditHistoryPanel 
                        history={editHistory}
                        onClear={clearEditHistory}
                        onSelect={handleSelectEditHistoryItem}
                    />
                </div>
             </div>
          )}
          {activeTab === 'utilities' && (
            <UtilitiesTab onEditRequest={handleEditRequest} />
          )}
        </main>
      </div>
      
      {upscaledImageForModal && (
        <UpscaleModal imageUrl={upscaledImageForModal} onClose={() => setUpscaledImageForModal(null)} />
      )}
      {imageForFullscreen && (
        <ImageViewerModal imageUrl={imageForFullscreen} onClose={() => setImageForFullscreen(null)} />
      )}
    </div>
  );
}