import React from "react";
import PageHeader from "../CommenComponents/PageHeader";

const TermsAndConditions = () => {
  return (
    <>
      <PageHeader title="Terms & Conditions" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-gray-700 leading-relaxed space-y-8">

        <section>
          <h1 className="text-3xl font-bold text-primary-dark mb-4">
            Terms & Conditions
          </h1>

          <p>
            Welcome to our online saree store. By accessing, browsing, or using
            this website, you agree to comply with the following Terms &
            Conditions. These terms apply to all visitors, customers, and users
            of our website and services.
          </p>

          <p className="mt-3">
            If you do not agree with these terms, please refrain from using the
            website. We reserve the right to update or modify these terms at any
            time without prior notice.
          </p>
        </section>

        {/* Website Usage */}
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Website Usage</h2>
          <p>
            Users agree to access this website only for lawful purposes and not
            to engage in activities that may harm, disrupt, or compromise the
            functionality or security of the website.
          </p>

          <p className="mt-2">
            Any attempt to gain unauthorized access to the website, servers, or
            databases associated with the platform is strictly prohibited.
          </p>
        </section>

        {/* User Accounts */}
        <section>
          <h2 className="text-xl font-semibold mb-2">2. User Accounts</h2>

          <p>
            Customers may create an account to place orders and track their
            purchases. Users are responsible for maintaining the confidentiality
            of their account credentials.
          </p>

          <p className="mt-2">
            Any activity performed under your account will be considered your
            responsibility.
          </p>
        </section>

        {/* Product Information */}
        <section>
          <h2 className="text-xl font-semibold mb-2">3. Product Information</h2>

          <p>
            We make every effort to ensure product descriptions, images, and
            pricing are accurate. However, slight variations may occur due to
            fabric textures, weaving methods, and lighting conditions used
            during photography.
          </p>

          <p className="mt-2">
            Handwoven sarees and traditional fabrics may have natural
            irregularities that reflect the authenticity of the craft and
            should not be considered defects.
          </p>
        </section>

        {/* Color Disclaimer */}
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Color Variation Disclaimer</h2>

          <p>
            The color of sarees displayed on our website may vary slightly from
            the actual product due to differences in screen resolution,
            lighting conditions, and device display settings.
          </p>
        </section>

        {/* Pricing */}
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Pricing & Payments</h2>

          <p>
            All prices listed on the website are in Indian Rupees (₹) unless
            otherwise stated. Prices are subject to change without prior notice.
          </p>

          <p className="mt-2">
            Payment must be completed during checkout using secure payment
            methods. Orders will only be processed after successful payment
            confirmation.
          </p>
        </section>

        {/* Product Availability */}
        <section>
          <h2 className="text-xl font-semibold mb-2">6. Product Availability</h2>

          <p>
            While we strive to maintain accurate inventory levels, certain
            products may become unavailable due to high demand or technical
            errors. In such cases, customers will be notified and refunded if
            payment has already been made.
          </p>
        </section>

        {/* Order Confirmation */}
        <section>
          <h2 className="text-xl font-semibold mb-2">7. Order Confirmation</h2>

          <p>
            After placing an order, customers will receive an order confirmation
            via email or SMS. This confirmation does not guarantee acceptance of
            the order.
          </p>

          <p className="mt-2">
            We reserve the right to cancel orders due to product unavailability,
            payment verification issues, or suspected fraudulent activity.
          </p>
        </section>

        {/* Order Cancellation */}
        <section>
          <h2 className="text-xl font-semibold mb-2">8. Order Cancellation</h2>

          <p>
            Customers may cancel orders before the product is shipped. Once the
            product has been dispatched, cancellations may not be possible.
          </p>
        </section>

        {/* Shipping */}
        <section>
          <h2 className="text-xl font-semibold mb-2">9. Shipping Policy</h2>

          <p>
            Orders are usually processed within 1–2 business days after payment
            confirmation.
          </p>

          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Domestic delivery: 3–7 business days</li>
            <li>International delivery: 7–15 business days</li>
            <li>Tracking details will be provided once the order is shipped</li>
          </ul>

          <p className="mt-2">
            Delivery timelines may vary depending on courier services and
            location.
          </p>
        </section>

        {/* Returns */}
        <section>
          <h2 className="text-xl font-semibold mb-2">10. Return & Refund Policy</h2>

          <p>
            Returns are accepted only for damaged or incorrect products reported
            within 48 hours of delivery.
          </p>

          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Product must be unused and unwashed</li>
            <li>Original packaging and tags must be intact</li>
            <li>Clear photos of the issue must be provided</li>
          </ul>

          <p className="mt-2">
            Refunds will be processed within 5–7 business days after inspection
            of the returned item.
          </p>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-xl font-semibold mb-2">11. Privacy Policy</h2>

          <p>
            We respect your privacy and are committed to protecting your
            personal information. Customer data is used only for order
            processing, delivery, and improving user experience.
          </p>

          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Customer details such as name, phone number, and address are collected.</li>
            <li>Information is used only for order processing and delivery.</li>
            <li>We do not sell or share personal data with third parties.</li>
          </ul>
        </section>

        {/* Fraud */}
        <section>
          <h2 className="text-xl font-semibold mb-2">12. Fraud Prevention</h2>

          <p>
            We reserve the right to cancel orders if fraudulent activity,
            unauthorized payment methods, or suspicious transactions are
            detected.
          </p>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-xl font-semibold mb-2">13. Intellectual Property</h2>

          <p>
            All website content including images, designs, logos, graphics, and
            text are the property of our brand and protected by copyright laws.
          </p>
        </section>

        {/* Force Majeure */}
        <section>
          <h2 className="text-xl font-semibold mb-2">14. Force Majeure</h2>

          <p>
            We shall not be liable for delays or failure to perform obligations
            due to events beyond our control such as natural disasters,
            pandemics, transportation disruptions, or government restrictions.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-xl font-semibold mb-2">15. Governing Law</h2>

          <p>
            These Terms & Conditions are governed by the laws of India. Any
            disputes shall be subject to the jurisdiction of courts in Tamil
            Nadu.
          </p>
        </section>

      </div>
    </>
  );
};

export default TermsAndConditions;