/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 현재 날짜를 YYYY-MM-DD 형식의 문자열로 반환
 */
export const getLocalDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * 날짜 문자열을 포맷팅 (YYYY-MM-DD -> YYYY / MM / DD)
 */
export const formatDateString = (dateStr: string): string => {
  return dateStr.split('-').join(' / ');
};

