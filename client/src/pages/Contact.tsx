import { useMemo, useState } from 'react';
import SEOHead from '../components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useContactStore } from '../store/contactStore';
import Cart from '../components/Cart';

const Contact = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { contactInfo } = useContactStore();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [captcha, setCaptcha] = useState('');

    // ✅ Капча генерируется ОДИН раз, и меняется ТОЛЬКО при submit (или вручную, если захочешь)
    const [captchaTask, setCaptchaTask] = useState(() => ({
        num1: Math.floor(Math.random() * 10) + 1,
        num2: Math.floor(Math.random() * 10) + 1,
    }));

    const correctAnswer = useMemo(
        () => captchaTask.num1 + captchaTask.num2,
        [captchaTask.num1, captchaTask.num2]
    );

    const refreshCaptcha = () => {
        setCaptchaTask({
            num1: Math.floor(Math.random() * 10) + 1,
            num2: Math.floor(Math.random() * 10) + 1,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (parseInt(captcha, 10) !== correctAnswer) {
            alert('Неверный ответ на капчу');
            // ❗ опционально: обновляем капчу и чистим ввод, чтобы не брутфорсили
            refreshCaptcha();
            setCaptcha('');
            return;
        }

        alert('Сообщение отправлено!');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setCaptcha('');

        // ✅ обновляем капчу ТОЛЬКО после отправки (успешной)
        refreshCaptcha();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gray-50" itemScope itemType="https://schema.org/ContactPage">
            <SEOHead
                title="Контакты — VitaWin | Связаться с нами"
                description="Свяжитесь с VitaWin для консультации по витаминам и БАД. Наши специалисты ответят на все вопросы. Форма обратной связи, телефон, email адрес."
                keywords="контакты vitawin, связаться, консультация витамины, поддержка клиентов, форма обратной связи"
                ogTitle="Контакты VitaWin — Связаться с нами"
                ogDescription="Получите консультацию специалистов VitaWin по витаминам и БАД. Заполните форму или свяжитесь по телефону."
                ogUrl={`${window.location.origin}/contact`}
                ogImage={`${window.location.origin}/vitawin-logo.png`}
                twitterTitle="Контакты VitaWin"
                twitterDescription="Консультация по витаминам и БАД. Свяжитесь с нашими специалистами."
            />
            <Header onCartClick={() => setIsCartOpen(true)} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                        {contactInfo.pageTitle}
                    </h1>
                    <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                        {contactInfo.pageDescription}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                    {/* Contact Form */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg md:text-xl">Форма обратной связи</CardTitle>
                            <CardDescription className="text-sm md:text-base">
                                Заполните форму, и мы свяжемся с вами в ближайшее время
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                                <div>
                                    <Label htmlFor="name" className="text-sm md:text-base">Имя</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="subject" className="text-sm md:text-base">Тема</Label>
                                    <Input
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="message" className="text-sm md:text-base">Сообщение</Label>
                                    <Textarea
                                        id="message"
                                        name="message"
                                        rows={4}
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                {/* ✅ Simple Math Captcha (не меняется при вводе, только после submit) */}
                                <div>
                                    <Label htmlFor="captcha" className="text-sm md:text-base">
                                        Решите пример: {captchaTask.num1} + {captchaTask.num2} = ?
                                    </Label>
                                    <Input
                                        id="captcha"
                                        type="number"
                                        value={captcha}
                                        onChange={(e) => setCaptcha(e.target.value)}
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                <Button type="submit" className="w-full text-sm md:text-base">
                                    Отправить сообщение
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Contact Information and Map */}
                    <div className="space-y-6 md:space-y-8">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg md:text-xl">Контактная информация</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4 md:space-y-6">
                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm md:text-base font-semibold">Адрес производства</h4>
                                        <p className="text-sm md:text-base text-gray-600">Б.Сампсониевский 66Б, СПБ.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm md:text-base font-semibold">Телефон</h4>
                                        <p className="text-sm md:text-base text-gray-600">{contactInfo.phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm md:text-base font-semibold">Email</h4>
                                        <p className="text-sm md:text-base text-gray-600">{contactInfo.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm md:text-base font-semibold">Часы работы</h4>
                                        <p className="text-sm md:text-base text-gray-600">{contactInfo.workingHours.weekdays}</p>
                                        <p className="text-sm md:text-base text-gray-600">{contactInfo.workingHours.weekends}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Production Location Map */}
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg md:text-xl">Расположение производства</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                                    <div className="text-center p-4">
                                        <MapPin className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm md:text-base text-gray-500">Интерактивная карта</p>
                                        <p className="text-xs md:text-sm text-gray-400 mt-1 break-words">Б.Сампсониевский 66Б, СПБ.</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Координаты: {contactInfo.coordinates.latitude}, {contactInfo.coordinates.longitude}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
};

export default Contact;
