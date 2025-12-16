import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Index from "./pages/Index";
import Store from "./pages/Store";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Checkout from "./pages/Checkout";
import QuickCheckout from "./pages/QuickCheckout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import OrderCancelled from "./pages/OrderCancelled";
import CheckoutFail from "./pages/CheckoutFail";
import Affiliate from "./pages/Affiliate";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import MessageDemo from "./pages/MessageDemo";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ContractOffer from "./pages/ContractOffer";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Login from "./pages/login";
import Register from "./pages/Register";
import TransactionHistory from "./components/account/TransactionHistory";
import AccountsOverview from "./components/account/AccountsOverview";

import { PerformanceMonitor, preloadCriticalResources } from "./utils/performanceUtils";
import CustomScripts from "./components/CustomScripts";
import ScrollToTop from "./components/ScrollToTop";
import AuthSuccessNotification from "./components/AuthSuccessNotification";

import { LanguageProvider } from "./contexts/LanguageContext";
import { MessageProvider } from "./contexts/MessageContext";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";

import { useSyncAuth } from "@/hooks/useSyncAuth";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { UserGuard } from "@/components/guards/UserGuard";


// ───────────────────────────────────────────────
// AppContent — главная логика приложения
// ───────────────────────────────────────────────
const AppContent = () => {

    // ▶ Единственный глобальный sync, только через /auth/me
    const { isLoading } = useSyncAuth();

    useEffect(() => {
        const monitor = PerformanceMonitor.getInstance();
        monitor.initializeMonitoring();
        preloadCriticalResources();
    }, []);

    // ▶ Глобальный лоадер (пока не знаем кто user/admin)
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p>Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <CustomScripts position="head" />
            <ScrollToTop />
            <AuthSuccessNotification />

            <Routes>
                {/* PUBLIC */}
                <Route path="/" element={<Index />} />
                <Route path="/store" element={<Store />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/affiliate" element={<Affiliate />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<BlogArticle />} />
                <Route path="/message-demo" element={<MessageDemo />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/contract-offer" element={<ContractOffer />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />

                {/* AUTH */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registry" element={<Register />} />

                {/* USER PRIVATE */}
                <Route path="/account" element={<UserGuard><Account /></UserGuard>} />
                <Route path="/account/transactions" element={<UserGuard><TransactionHistory /></UserGuard>} />
                <Route path="/account/accounts" element={<UserGuard><AccountsOverview /></UserGuard>} />
                <Route path="/checkout" element={<UserGuard><Checkout /></UserGuard>} />
                <Route path="/quick-checkout" element={<UserGuard><QuickCheckout /></UserGuard>} />
                <Route path="/checkout-success" element={<UserGuard><CheckoutSuccess /></UserGuard>} />
                <Route path="/checkout-failed" element={<UserGuard><CheckoutFail /></UserGuard>} />
                <Route path="/order-success" element={<UserGuard><OrderSuccess /></UserGuard>} />
                <Route path="/order-cancelled" element={<UserGuard><OrderCancelled /></UserGuard>} />

                {/* ADMIN */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>

            <CustomScripts position="body" />
        </>
    );
};


// ───────────────────────────────────────────────
// Корневой экспорт
// ───────────────────────────────────────────────
export default function App() {
    return (
        <LanguageProvider>
            <MessageProvider position="top-right">
                <TooltipProvider>
                    <Toaster />
                    <BrowserRouter>
                        <AppContent />
                    </BrowserRouter>
                </TooltipProvider>
            </MessageProvider>
        </LanguageProvider>
    );
}
