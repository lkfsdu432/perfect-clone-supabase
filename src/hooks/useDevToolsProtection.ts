import { useEffect } from 'react';

const useDevToolsProtection = () => {
  useEffect(() => {
    // Disable right-click context menu (except in select-text elements)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // السماح بالكليك يمين داخل العناصر اللي فيها class "select-text"
      if (target && typeof target.closest === 'function' && target.closest('.select-text')) {
        return;
      }
      e.preventDefault();
    };

    // Disable keyboard shortcuts for DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Element selector)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection (except in select-text elements)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // السماح بالتحديد في input و textarea
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return true;
      }
      // السماح بالتحديد في العناصر اللي فيها class "select-text"
      if (target && typeof target.closest === 'function' && target.closest('.select-text')) {
        return true;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);
};

export default useDevToolsProtection;
