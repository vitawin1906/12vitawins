// client/src/constants/mlmStatuses.ts

export type MlmStatusKey = "standard" | "partner" | "partner_pro";

export type MlmStatusConfig = {
    key: MlmStatusKey;
    backendValue: string | null; // что приходит из user.mlmStatus
    uiName: string;              // то, что показываем в UI ("Standard", "Partner PRO")
    alias: string;               // локализованный/маркетинговый алиас ("Покупатель", "Партнер")
    activationPrice: number;     // цена активации в ₽
    personalVolume: number;      // минимальный личный объем (PV)
};

export const MLM_STATUS_ORDER: MlmStatusKey[] = ["standard", "partner", "partner_pro"];

export const MLM_STATUS_CONFIG: Record<MlmStatusKey, MlmStatusConfig> = {
    standard: {
        key: "standard",
        backendValue: null, // или "customer" если бек шлёт customer
        uiName: "Standard",
        alias: "Покупатель",
        activationPrice: 0,
        personalVolume: 0,
    },
    partner: {
        key: "partner",
        backendValue: "partner",
        uiName: "Partner",
        alias: "Партнер",
        activationPrice: 7500,
        personalVolume: 35,
    },
    partner_pro: {
        key: "partner_pro",
        backendValue: "partner_pro",
        uiName: "Partner PRO",
        alias: "Партнер PRO",
        activationPrice: 30000,
        personalVolume: 150,
    },
};

// Утилита для маппинга значения из бэка в ключ
export const mapMlmStatus = (mlmStatus?: string | null): MlmStatusKey => {
    if (mlmStatus === "partner_pro") return "partner_pro";
    if (mlmStatus === "partner") return "partner";
    return "standard";
};
