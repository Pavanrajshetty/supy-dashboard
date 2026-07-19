import React, { useState } from "react";
import "./styles.css";

import Navbar from "./components/Navbar";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import MTDData from "./pages/MTDData";
import QTDMonthly from "./pages/QTDMonthly";
import Trends from "./pages/Trends";
import WeekOnWeek from "./pages/WeekOnWeek";
import SQL from "./pages/SQL";
import MeetingsBooked from "./pages/MeetingsBooked";
import GoogleAdsExecutive from "./pages/GoogleAdsExecutive";
import GoogleAdsGeo from "./pages/GoogleAdsGeo";
import GoogleAdsCampaigns from "./pages/GoogleAdsCampaigns";
import GoogleAdsSearchTerms from "./pages/GoogleAdsSearchTerms";
import GoogleAdsKeywords from "./pages/GoogleAdsKeywords";
import GoogleAdsNegativeKeywords from "./pages/GoogleAdsNegativeKeywords";

export default function App() {
  const [activePage, setActivePage] = useState("executive");

  const pages = {
    executive: <ExecutiveSummary />,
    mtd:       <MTDData />,
    qtd:       <QTDMonthly />,
    trends:    <Trends />,
    wow:       <WeekOnWeek />,
    sql:       <SQL />,
    meetings:  <MeetingsBooked />,
    ga_exec:      <GoogleAdsExecutive />,
    ga_geo:       <GoogleAdsGeo />,
    ga_campaigns: <GoogleAdsCampaigns />,
    ga_terms:     <GoogleAdsSearchTerms />,
    ga_keywords:  <GoogleAdsKeywords />,
  };

  return (
    <div className="app">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="app-main">
        {pages[activePage]}
      </main>
    </div>
  );
}
