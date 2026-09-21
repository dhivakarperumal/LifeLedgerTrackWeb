import React from "react";
import { useParams } from "react-router-dom";
import Shop from "../Home/Shop";

const CategoryPage = () => {
  const { categoryName } = useParams();

  return <Shop defaultCategory={categoryName} />;
};

export default CategoryPage;