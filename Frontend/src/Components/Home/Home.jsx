import React from 'react'
import Hero from "../Hero"
import SareeBanner from '../SareeBanner'
import Banner from '../Banner'
import About from "../About/About"
import ProductsCard from '../Products/ProductsCard'
import VideoSwiper from './VideoSwiper'
import CategoryIcon from './CategoryIcon'
import SareeSwiper from './SareeSwiper'
import TrendingProducts from './TrendingProducts'
import OfferProducts from '../Products/OfferProducts'

const Home = () => {
  return (
    <div>
      <div>
        <Hero />
      </div>
      <div>
        <CategoryIcon/>
      </div>
      <div>
        <SareeSwiper />
      </div>
      <div>
        <About />
      </div>
      <div>
        <TrendingProducts />
      </div>
      <div>
        <SareeBanner />
      </div>
      <div>
        <OfferProducts />
      </div>
      <div>
        <Banner />
      </div>
      <div>
        <VideoSwiper />
      </div>
    </div>
  )
}

export default Home
