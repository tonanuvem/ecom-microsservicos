package com.ecom.runners;

import org.junit.platform.suite.api.*;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = "cucumber.plugin", value = "pretty,html:target/cucumber-report.html")
@ConfigurationParameter(key = "cucumber.glue", value = "com.ecom.steps")
public class CucumberRunner {}
