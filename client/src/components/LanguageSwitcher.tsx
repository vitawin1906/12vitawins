
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center">
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className="w-[90px] border-none focus:ring-0 focus:ring-offset-0 bg-transparent">
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            <SelectValue>{language.toUpperCase()}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ru">Русский</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
