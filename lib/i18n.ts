import {uiCopy} from './ui-i18n';
import {normalizeCountry,englishMarket} from '../shared/countries';
import {translatedCategory} from '../shared/categories';
export {categories,categoryValue,categoryAliases} from '../shared/categories';
import {locales,brand,contentLocale,isLocale,type Locale} from '../shared/domain';
export {locales,brand,isLocale,type Locale};
export const languageNames: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt' };
export function contentLanguageName(language: string, locale: Locale) {
  if (isLocale(language)) return languageNames[language];
  try { return new Intl.DisplayNames([locale], { type: 'language' }).of(language) || language; }
  catch { return language; }
}
const english = {
  tagline: 'Good stories have no borders', slow: 'Slow down. Open a new perspective.',
  explore: 'Explore', saved: 'Saved stories', editors: 'Editorial studio',
  theme: 'Switch light / dark theme', reading: 'Reading preferences', font: 'Font', size: 'Text size', done: 'Done',
  eyebrow: 'ONE WORLD. COUNTLESS STORIES.', hero: 'Go further.', heroEnd: 'Understand more.',
  intro: 'Journeys, people and ideas worth sharing. Discover the world, one story at a time.',
  local: 'Local perspectives.', global: 'Global inspiration.', allCountries: 'All countries',
  all: 'All', travel: 'Journeys', culture: 'Culture', life: 'Everyday life', food: 'Food', inspiration: 'Inspiration',
  search: 'Find a story…', stories: 'Stories worth reading', daily: 'A FRESH PERSPECTIVE, EVERY DAY',
  pick: 'EDITOR’S PICK', minutes: 'min read', read: 'Read the story', save: 'Save story',
  empty: 'No stories in this selection yet', emptyHint: 'Try another filter, or come back for more stories in this language.',
  reset: 'Reset filters', ad: 'ADVERTISEMENT', 
  closingLabel: 'EVERY STORY OPENS A DOOR', closing: 'There is always more to discover.',
  closingHint: 'Stay curious. Find new perspectives. Start right here.', continue: 'Keep exploring',
  copyright: 'Stories that bring us together.', back: 'Back to stories', like: 'Love this story', liked: 'Loved',
  savedDone: 'Saved', language: 'Language', country: 'Country', notFound: 'Story not found',
  notFoundHint: 'This story is not available in this language, or has not been published.',
  overview: 'Overview', posts: 'Posts', website: 'View website', logout: 'Sign out',
  welcome: 'Welcome back.', loginHint: 'Sign in to share your next story.', password: 'Password', login: 'Sign in',
  loginNote: 'Your account is configured by the website owner.', loading: 'Loading…',
  activity: 'Activity overview', library: 'Story library', adminHint: 'Stories that connect. Numbers that matter.',
  newPost: 'Write a story', users: 'Unique readers', views: 'Page views', likes: 'Likes', publishedPosts: 'Published stories',
  anonymous: 'Anonymous browser IDs', total: 'All time', chart: 'The pulse of Once Upon Today',
  chartHint: 'Views and likes over the last 14 days (UTC)', noStats: 'No views yet. Your chart will update when someone reads a story.',
  recent: 'Recent stories', allPosts: 'All stories', status: 'Status', actions: 'Actions', published: 'Published', draft: 'Draft',
  edit: 'Edit', remove: 'Delete', confirmDelete: 'Delete this story?',
  statsNote: 'Anonymous browser statistics, not registered accounts. Repeat views are grouped by story and day.',
  editStory: 'Edit story', newStory: 'A new story', close: 'Close', title: 'Title', category: 'Category',
  metadataHint: 'Country is hidden metadata. Language determines which language edition displays this story.',
  author: 'Author', image: 'Cover image URL (HTTPS)', excerpt: 'Short description', content: 'Content',
  publishNow: 'Publish now (uncheck to save a draft)', publish: 'Save and publish', saveDraft: 'Save draft',
  requestError: 'Something went wrong. Please try again.', loginError: 'Username or password is incorrect.',
  configError: 'The administrator account has not been configured on the server.', rateError: 'Too many attempts. Try again in 15 minutes.',
  validationError: 'Please complete all fields and choose a supported language.', imageError: 'Use a valid HTTPS image URL.',
};
export type Dictionary = Record<keyof typeof english, string>;
// Every locale must provide the same keys, so missing translations fail type checking.
const vi: Dictionary = {
  tagline:'Những câu chuyện hay không có biên giới',slow:'Chậm một nhịp. Mở một góc nhìn.',explore:'Khám phá',saved:'Bài đã lưu',editors:'Không gian biên tập',theme:'Đổi giao diện sáng / tối',reading:'Tùy chỉnh cách đọc',font:'Phông chữ',size:'Cỡ chữ',done:'Xong',eyebrow:'MỘT THẾ GIỚI. VẠN CÂU CHUYỆN.',hero:'Đi xa hơn.',heroEnd:'Hiểu nhiều hơn.',intro:'Những hành trình, con người và ý tưởng đáng được kể. Khám phá thế giới, qua từng trang viết.',local:'Góc nhìn địa phương.',global:'Cảm hứng toàn cầu.',allCountries:'Tất cả quốc gia',all:'Tất cả',travel:'Hành trình',culture:'Văn hóa',life:'Đời sống',food:'Ẩm thực',inspiration:'Cảm hứng',search:'Tìm câu chuyện…',stories:'Câu chuyện đáng đọc',daily:'GÓC NHÌN MỚI MỖI NGÀY',pick:'LỰA CHỌN CỦA BIÊN TẬP VIÊN',minutes:'phút đọc',read:'Đọc câu chuyện',save:'Lưu bài',empty:'Chưa có câu chuyện phù hợp',emptyHint:'Thử bộ lọc khác hoặc quay lại để đọc thêm bài bằng ngôn ngữ này.',reset:'Đặt lại bộ lọc',ad:'QUẢNG CÁO',closingLabel:'MỖI CÂU CHUYỆN LÀ MỘT CÁNH CỬA',closing:'Thế giới còn nhiều điều để khám phá.',closingHint:'Giữ sự tò mò. Tìm những góc nhìn mới. Bắt đầu ngay từ đây.',continue:'Tiếp tục khám phá',copyright:'Viết để kết nối.',back:'Trở về danh sách bài',like:'Yêu thích câu chuyện',liked:'Đã yêu thích',savedDone:'Đã lưu',language:'Ngôn ngữ',country:'Quốc gia',notFound:'Không tìm thấy bài viết',notFoundHint:'Bài viết chưa có bằng ngôn ngữ này hoặc chưa được xuất bản.',overview:'Tổng quan',posts:'Bài viết',website:'Xem website',logout:'Đăng xuất',welcome:'Chào mừng trở lại.',loginHint:'Đăng nhập để chia sẻ câu chuyện của bạn.',password:'Mật khẩu',login:'Đăng nhập',loginNote:'Tài khoản được thiết lập bởi chủ website.',loading:'Đang tải…',activity:'Tổng quan hoạt động',library:'Thư viện bài viết',adminHint:'Những câu chuyện kết nối. Những con số có ý nghĩa.',newPost:'Viết bài mới',users:'Người đọc duy nhất',views:'Lượt xem',likes:'Yêu thích',publishedPosts:'Bài đã xuất bản',anonymous:'Theo trình duyệt ẩn danh',total:'Tổng cộng từ khi khởi tạo',chart:'Nhịp đập của Once Upon Today',chartHint:'Lượt xem và yêu thích trong 14 ngày gần nhất (UTC)',noStats:'Chưa có lượt xem. Biểu đồ sẽ cập nhật khi có người đọc bài.',recent:'Câu chuyện gần đây',allPosts:'Tất cả bài viết',status:'Trạng thái',actions:'Thao tác',published:'Đã xuất bản',draft:'Bản nháp',edit:'Sửa',remove:'Xóa',confirmDelete:'Xóa bài viết này?',statsNote:'Thống kê theo ID trình duyệt ẩn danh, không phải tài khoản. Lượt xem trùng được gộp theo bài/ngày.',editStory:'Chỉnh sửa câu chuyện',newStory:'Một câu chuyện mới',close:'Đóng',title:'Tiêu đề',category:'Chuyên mục',metadataHint:'Quốc gia là metadata ẩn. Ngôn ngữ quyết định bài xuất hiện ở phiên bản ngôn ngữ nào.',author:'Tác giả',image:'URL ảnh bìa (HTTPS)',excerpt:'Mô tả ngắn',content:'Nội dung',publishNow:'Xuất bản ngay (bỏ chọn để lưu nháp)',publish:'Lưu và xuất bản',saveDraft:'Lưu bản nháp',requestError:'Có lỗi xảy ra. Vui lòng thử lại.',loginError:'Tên đăng nhập hoặc mật khẩu không đúng.',configError:'Tài khoản quản trị chưa được cấu hình trên máy chủ.',rateError:'Thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',validationError:'Điền đầy đủ các trường và chọn ngôn ngữ được hỗ trợ.',imageError:'Sử dụng URL ảnh HTTPS hợp lệ.',
};
const dictionaries: Record<Locale, Dictionary> = { en: english, vi };
export function dictionary(locale: Locale): Dictionary { return dictionaries[locale]; }
const legacyCategories = ['Hành trình','Văn hóa','Đời sống','Ẩm thực','Cảm hứng'] as const;
const categoryKeys = ['travel','culture','life','food','inspiration'] as const;
export function categoryName(category: string, locale: Locale) {
  const translated=translatedCategory(category,locale);
  if(translated)return translated;
  if(category==='Stories')return uiCopy(locale).storyCategory;
  const index = legacyCategories.findIndex(c => c === category);
  return index < 0 ? category : dictionary(locale)[categoryKeys[index]];
}
export function countryName(code: string, locale: Locale) {
  if(normalizeCountry(code)===englishMarket)return englishMarket;
  return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;
}
export function postHref(post: { id: string; language: string }) {
  return `/${contentLocale(post.language)}/posts/${encodeURIComponent(post.id)}`;
}
export function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(`${date}T00:00:00Z`));
}
