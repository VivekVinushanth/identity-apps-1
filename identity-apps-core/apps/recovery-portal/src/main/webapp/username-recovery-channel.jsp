<%--
  ~ Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com).
  ~
  ~ WSO2 LLC. licenses this file to you under the Apache License,
  ~ Version 2.0 (the "License"); you may not use this file except
  ~ in compliance with the License.
  ~ You may obtain a copy of the License at
  ~
  ~    http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing,
  ~ software distributed under the License is distributed on an
  ~ "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  ~ KIND, either express or implied.  See the License for the
  ~ specific language governing permissions and limitations
  ~ under the License.
--%>

<%@ page contentType="text/html;charset=UTF-8" language="java" %>

<%@ page import="org.apache.commons.lang.StringUtils" %>
<%@ page import="org.owasp.encoder.Encode" %>
<%@ page import="org.wso2.carbon.identity.base.IdentityRuntimeException" %>
<%@ page import="org.wso2.carbon.identity.captcha.util.CaptchaUtil" %>
<%@ page import="org.wso2.carbon.identity.core.util.IdentityTenantUtil" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.IdentityManagementEndpointConstants" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.IdentityManagementEndpointUtil" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.ApiException" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.api.ReCaptchaApi" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.api.UsernameRecoveryApi" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.Claim" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.ReCaptchaProperties" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.recovery.v2.*" %>
<%@ page import="java.io.File" %>
<%@ page import="java.util.Arrays" %>
<%@ page import="java.util.HashMap" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Map" %>
<%@ taglib prefix="layout" uri="org.wso2.identity.apps.taglibs.layout.controller" %>

<%-- Localization --%>
<jsp:directive.include file="includes/localize.jsp"/>

<%-- Include tenant context --%>
<jsp:directive.include file="tenant-resolve.jsp"/>

<%-- Branding Preferences --%>
<jsp:directive.include file="includes/branding-preferences.jsp"/>

<%!

    public static String getChannelIdFromChannelName(List<RecoveryChannel> channels, String channelName){

        // Check if channels are null.
        if (channels == null){
            if (StringUtils.equals(channelName, "EMAIL")){
                return "1";
            } else if (StringUtils.equals(channelName, "SMS")){
                return "2";
            }
        }
       
       // If channels are not null, loop throught them.
        for (RecoveryChannel channel : channels) {
            if (channel.getType().equals(channelName)) {
                return channel.getId();
            }
        }

        // Return null if no matching channel found.
        return null;
    }

%>

<%
    if (!Boolean.parseBoolean(application.getInitParameter(
            IdentityManagementEndpointConstants.ConfigConstants.ENABLE_EMAIL_NOTIFICATION))) {
        response.sendError(HttpServletResponse.SC_FOUND);
        return;
    }

    boolean error = IdentityManagementEndpointUtil.getBooleanValue(request.getAttribute("error"));
    String errorMsg = IdentityManagementEndpointUtil.getStringValue(request.getAttribute("errorMsg"));
    List<RecoveryChannel> channels = null;
    if(request.getAttribute("channels") != null){
        channels = (List<RecoveryChannel>) request.getAttribute("channels");
    }
    
    String recoveryCode = IdentityManagementEndpointUtil.getStringValue(request.getAttribute("recoveryCode"));
    Boolean isUserFound = IdentityManagementEndpointUtil.getBooleanValue(request.getAttribute("isUserFound"));
    Boolean noChannelFound = IdentityManagementEndpointUtil.getBooleanValue(request.getAttribute("noChannelFound"));

    String EMAIL = "EMAIL";
    String SMS = "SMS";
    String selectedOption = EMAIL;

    // Skipping the channel selection once we don't have channels or only have one channel.
    if(channels != null && channels.size() == 1){
        request.setAttribute("usernameRecoveryOption", channels.get(0).getId() + ":" + channels.get(0).getType());
        request.setAttribute("recoveryStage", "NOTIFY");
        request.getRequestDispatcher("verify.do").forward(request, response);
        return;
    }
    
%>

<%-- Data for the layout from the page --%>
<%
    layoutData.put("containerSize", "large");
%>

<!doctype html>
<html lang="en-US">
<head>
    <%-- header --%>
    <%
        File headerFile = new File(getServletContext().getRealPath("extensions/header.jsp"));
        if (headerFile.exists()) {
    %>
        <jsp:include page="extensions/header.jsp"/>
    <% } else { %>
        <jsp:include page="includes/header.jsp"/>
    <% } %>

</head>
<body class="login-portal layout recovery-layout">
    <layout:main layoutName="<%= layout %>" layoutFileRelativePath="<%= layoutFileRelativePath %>" data="<%= layoutData %>" >
        <layout:component componentName="ProductHeader">
            <%-- product-title --%>
            <%
                File productTitleFile = new File(getServletContext().getRealPath("extensions/product-title.jsp"));
                if (productTitleFile.exists()) {
            %>
            <jsp:include page="extensions/product-title.jsp"/>
            <% } else { %>
            <jsp:include page="includes/product-title.jsp"/>
            <% } %>
        </layout:component>
        <layout:component componentName="MainSection" >
            <div class="ui segment">
                <h2><%=IdentityManagementEndpointUtil.i18n(recoveryResourceBundle, "Recover.username")%></h2>
                <% if (error) { %>
                    <div class="ui visible negative message" id="server-error-msg">
                        <%= IdentityManagementEndpointUtil.i18nBase64(recoveryResourceBundle, errorMsg) %>
                    </div>
                <% } %>
                <div class="ui negative message" id="error-msg" hidden="hidden"></div>

                <%=IdentityManagementEndpointUtil.i18n(recoveryResourceBundle, "Select.the.recovery.option")%>

                <div class="ui divider hidden"></div>

                <div class="segment-form">
                    <form class="ui large form" method="post" action="verify.do" id="recoverDetailsForm">
                  
                        <%
                            String callback = IdentityManagementEndpointUtil.getStringValue(request.getAttribute("callback"));

                            if (StringUtils.isBlank(callback)) {
                                callback = IdentityManagementEndpointUtil.getUserPortalUrl(
                                        application.getInitParameter(IdentityManagementEndpointConstants.ConfigConstants.USER_PORTAL_URL), tenantDomain);
                            }

                            if (callback != null) {
                        %>
                        <div>
                            <input type="hidden" name="callback" value="<%=Encode.forHtmlAttribute(callback) %>"/>
                        </div>
                        <div>
                            <input type="hidden" name="sp" value="<%=Encode.forHtmlAttribute(request.getParameter("sp"))%>"/>
                        </div>
                                
                        <% } %>

                              <div class="field">
                                <div class="ui radio checkbox">
                                    <input type="radio" name="usernameRecoveryOption" value="<%=getChannelIdFromChannelName(channels, EMAIL) + ":" + EMAIL%>"
                                        <%=EMAIL.equals(selectedOption)?"checked":""%>/>
                                    <label><%=i18n(recoveryResourceBundle, customText, "Send.username.via.email")%>
                                    </label>
                                </div>
                            </div>
                                  <div class="field">
                                <div class="ui radio checkbox">
                                    <input type="radio" name="usernameRecoveryOption" value="<%=getChannelIdFromChannelName(channels, SMS) + ":" + SMS%>"
                                        <%=SMS.equals(selectedOption)?"checked":""%>/>
                                    <label><%=i18n(recoveryResourceBundle, customText, "Send.username.via.sms")%>
                                    </label>
                                </div>
                            </div>

                        <input type="hidden" id="isUsernameRecovery" name="isUsernameRecovery" value="true">
                        <input type="hidden" id="recoveryStage" name="recoveryStage" value="NOTIFY">
                        <input type="hidden" id="isUserFound" name="isUserFound" value=<%=isUserFound%>>
                        <input type="hidden" id="recoveryCode" name="recoveryCode" value=<%=recoveryCode%>>

                        <div class="ui divider hidden"></div>
                        <div class="mt-4">
                            <button id="recoverySubmit" class="ui primary button large fluid" type="submit">
                                    <%=IdentityManagementEndpointUtil.i18n(recoveryResourceBundle, "Next")%>
                            </button>
                        </div>
                        <div class="mt-1 align-center">
                            <a href="javascript:goBack()" class="ui button secondary large fluid">
                                <%=IdentityManagementEndpointUtil.i18n(recoveryResourceBundle, "Cancel")%>
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </layout:component>
        <layout:component componentName="ProductFooter">
            <%-- product-footer --%>
            <%
                File productFooterFile = new File(getServletContext().getRealPath("extensions/product-footer.jsp"));
                if (productFooterFile.exists()) {
            %>
                <jsp:include page="extensions/product-footer.jsp"/>
            <% } else { %>
                <jsp:include page="includes/product-footer.jsp"/>
            <% } %>
        </layout:component>
        <layout:dynamicComponent filePathStoringVariableName="pathOfDynamicComponent">
            <jsp:include page="${pathOfDynamicComponent}" />
        </layout:dynamicComponent>
    </layout:main>

    <%-- footer --%>
    <%
        File footerFile = new File(getServletContext().getRealPath("extensions/footer.jsp"));
        if (footerFile.exists()) {
    %>
        <jsp:include page="extensions/footer.jsp"/>
    <% } else { %>
        <jsp:include page="includes/footer.jsp"/>
    <% } %>

    <script type="text/javascript">
        function goBack() {
            window.history.back();
        }

        function onCompleted() {
            $("#recoverDetailsForm").submit();
        }

        $(document).ready(function () {

            $("#recoverDetailsForm").submit(function (e) {
                

                // Prevent clicking multiple times, and notify the user something
                // is happening in the background.
                const submitButton = $("#recoverySubmit");
                submitButton.addClass("loading").attr("disabled", true);

                const errorMessage = $("#error-msg");
                errorMessage.hide();
                return true;
            });
        });
    </script>
</body>
</html>
