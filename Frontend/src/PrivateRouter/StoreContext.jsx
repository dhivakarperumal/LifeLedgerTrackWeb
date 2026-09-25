import React, { createContext, useMemo, useState } from "react";

const defaultStoreValue = {
    monthlyBudget: 0,
    setMonthlyBudget: () => {},
};

export const StoreContext = createContext(defaultStoreValue);

export const StoreProvider = ({ children }) => {
    const [monthlyBudget, setMonthlyBudget] = useState(0);

    const value = useMemo(
        () => ({
            monthlyBudget,
            setMonthlyBudget,
        }),
        [monthlyBudget],
    );

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};
