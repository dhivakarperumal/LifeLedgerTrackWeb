import React, { createContext } from "react";

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
    return (
        <StoreContext.Provider value={{}}>
            {children}
        </StoreContext.Provider>
    );
};
