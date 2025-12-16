import { useEffect, useState } from 'react';

interface CustomScriptsProps {
  position: 'head' | 'body';
}

const CustomScripts = ({ position }: CustomScriptsProps) => {
  const [scripts, setScripts] = useState<string>('');

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const response = await fetch('/api/site-scripts');
        if (response.ok) {
          const data = await response.json();
          const scriptContent = position === 'head'
            ? data.head_scripts || ''
            : data.body_scripts || '';
          setScripts(scriptContent);
        } else if (response.status === 404) {
          // Endpoint не существует - это нормально, просто игнорируем
          console.debug('Site scripts endpoint not available');
        }
      } catch (error) {
        // Тихо игнорируем ошибки сети
        console.debug('Failed to fetch site scripts:', error);
      }
    };

    fetchScripts();
  }, [position]);

  useEffect(() => {
    if (scripts) {
      // Создаем временный div для парсинга HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = scripts;
      
      // Извлекаем и выполняем скрипты
      const scriptElements = tempDiv.querySelectorAll('script');
      scriptElements.forEach((script) => {
        const newScript = document.createElement('script');
        
        // Копируем атрибуты
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Копируем содержимое
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        
        // Добавляем в DOM
        if (position === 'head') {
          document.head.appendChild(newScript);
        } else {
          document.body.appendChild(newScript);
        }
      });
      
      // Добавляем остальные элементы (meta, link и т.д.)
      const otherElements = tempDiv.querySelectorAll(':not(script)');
      otherElements.forEach((element) => {
        if (position === 'head' && (element.tagName === 'META' || element.tagName === 'LINK' || element.tagName === 'STYLE')) {
          document.head.appendChild(element.cloneNode(true));
        }
      });
    }
  }, [scripts, position]);

  return null; // Этот компонент не рендерит видимый контент
};

export default CustomScripts;