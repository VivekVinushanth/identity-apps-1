/**
 * Copyright (c) 2019-2024, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useAuthContext } from "@asgardeo/auth-react";
import { useColorScheme } from "@mui/material";
import { Mode } from "@mui/system/cssVars/useCurrentColorScheme";
import { ThemeProviderContext } from "@wso2is/common.branding.v1/contexts/theme-provider-context";
import { CommonHelpers, isPortalAccessGranted } from "@wso2is/core/helpers";
import { RouteInterface, StorageIdentityAppsSettingsInterface, emptyIdentityAppsSettings } from "@wso2is/core/models";
import { LocalStorageUtils } from "@wso2is/core/utils";
import { I18n } from "@wso2is/i18n";
import {
    ChunkErrorModal,
    Code,
    MediaContextProvider,
    NetworkErrorModal,
    SessionManagementProvider,
    SessionTimeoutModalTypes
} from "@wso2is/react-components";
import isEmpty from "lodash-es/isEmpty";
import * as moment from "moment";
import React, { ReactElement, Suspense, useContext, useEffect, useState } from "react";
import { Trans } from "react-i18next";
import { useSelector } from "react-redux";
import { Redirect, Route, RouteProps, Router, Switch } from "react-router-dom";
import { PreLoader, ProtectedRoute } from "./components";
import { getBaseRoutes } from "./configs";
import { AppConstants } from "./constants";
import DecoratedApp from "./decorated-app";
import { history } from "./helpers";
import {
    ConfigReducerStateInterface,
    FeatureConfigInterface
} from "./models";
import { AppState } from "./store";
import { EventPublisher, filterRoutes } from "./utils";

/**
 * Main App component.
 *
 * @returns App root component.
 */
export const App = (): ReactElement => {

    const userName: string = useSelector((state: AppState) => state.authenticationInformation.username);
    const config: ConfigReducerStateInterface = useSelector((state: AppState) => state.config);
    const loginInit: boolean = useSelector((state: AppState) => state.authenticationInformation.loginInit);
    const allowedScopes: string = useSelector((state: AppState) => state?.authenticationInformation?.scope);
    const uuid: string = useSelector((state: AppState) => state.authenticationInformation.profileInfo.id);

    const [ baseRoutes, setBaseRoutes ] = useState<RouteInterface[]>(getBaseRoutes());

    const eventPublisher: EventPublisher = EventPublisher.getInstance();

    const { signOut, trySignInSilently } = useAuthContext();
    const { themePreference } = useContext(ThemeProviderContext);

    const { setMode } = useColorScheme();

    useEffect(() => {
        const mode: Mode = themePreference?.preference?.theme?.activeTheme.toLowerCase() as Mode
            ?? "light" as Mode;

        setMode(mode);
    }, [ themePreference ]);

    /**
     * Set the deployment configs in redux state.
     */
    useEffect(() => {
        sessionStorageDisabled();
    }, []);

    /**
     * Set the locale for moment library
     */
    useEffect(() => {
        moment.locale(I18n.instance.language);
    }, [ I18n.instance.language ]);

    /**
     * Listen for base name changes and updated the routes.
     */
    useEffect(() => {
        setBaseRoutes(getBaseRoutes());
    }, [ AppConstants.getTenantQualifiedAppBasename() ]);

    /**
     * Checks if the portal access should be granted based on the feature config.
     */
    useEffect(() => {
        if (!config?.ui?.features || !loginInit) {
            return;
        }

        if (isPortalAccessGranted<FeatureConfigInterface>(config?.ui?.features, allowedScopes)) {
            return;
        }

        history.push(AppConstants.getPaths().get("UNAUTHORIZED"));
    }, [ loginInit, allowedScopes, config ]);

    /**
     * Set the application settings of the user to the local storage.
     */
    useEffect(() => {
        if (!userName && userName === "") {
            return;
        }

        const tenant: string = config?.deployment?.tenant;
        const tenantAppSettings: Record<string, unknown> = JSON.parse(
            LocalStorageUtils.getValueFromLocalStorage(tenant)
        );
        const appSettings: Record<string, StorageIdentityAppsSettingsInterface> = {};

        appSettings[ userName ] = emptyIdentityAppsSettings();

        if (!tenantAppSettings) {
            LocalStorageUtils.setValueInLocalStorage(tenant, JSON.stringify(appSettings));
        } else {
            if (CommonHelpers.lookupKey(tenantAppSettings, userName) === null) {
                const newUserSettings: Record<string, unknown> = {
                    ...tenantAppSettings,
                    [ userName ]: emptyIdentityAppsSettings()
                };

                LocalStorageUtils.setValueInLocalStorage(tenant, JSON.stringify(newUserSettings));
            }
        }

    }, [ config?.deployment?.tenant, userName ]);

    /**
    * Publish page visit when the UUID is set.
    */
    useEffect(() => {
        if (!uuid) {
            return;
        }
        eventPublisher.publish("page-visit-myaccount-landing-page");
    }, [ uuid ]);

    /**
     * Handles session timeout abort.
     *
     * @param url - Current URL.
     */
    const handleSessionTimeoutAbort = (url: URL): void => {
        history.push({
            pathname: url.pathname,
            search: url.search
        });
    };

    /**
     * Handles session logout.
     */
    const handleSessionLogout = (): void => {
        history.push(AppConstants.getAppLogoutPath());
    };

    /**
     * Handles session disabled state.
     */
    const sessionStorageDisabled = (): void => {
        try {
            const storage: Storage = sessionStorage;

            if (!storage && location.pathname !== AppConstants.getPaths().get("STORING_DATA_DISABLED")) {
                history.push(AppConstants.getPaths().get("STORING_DATA_DISABLED"));
            }
        } catch {
            if (true && location.pathname !== AppConstants.getPaths().get("STORING_DATA_DISABLED")) {
                history.push(AppConstants.getPaths().get("STORING_DATA_DISABLED"));
            }
        }
    };

    /**
     * Handles the `stay logged in` option of the session management modal.
     * Sets a URL search param to notify the session management iframe to
     * do the necessary actions.
     */
    const handleStayLoggedIn = (): void => {
        trySignInSilently()
            .then((response: boolean) => {
                if (response === false) {
                    history.push(AppConstants.getAppLogoutPath());
                } else {
                    window.history.replaceState(null, null, window.location.pathname);
                }
            })
            .catch(() => {
                history.push(AppConstants.getAppLogoutPath());
            });
    };

    if (isEmpty(config?.deployment) || isEmpty(config?.endpoints)) {
        return <PreLoader />;
    }

    return (
        <Router history={ history }>
            <DecoratedApp>
                <div className="container-fluid">
                    <Suspense fallback={ <PreLoader /> }>
                        <MediaContextProvider>
                            <SessionManagementProvider
                                onSessionTimeoutAbort={ handleSessionTimeoutAbort }
                                onSessionLogout={ handleSessionLogout }
                                onLoginAgain={ handleStayLoggedIn }
                                modalOptions={ {
                                    description: (
                                        <Trans
                                            i18nKey={
                                                "myAccount:common.modals.sessionTimeoutModal.description"
                                            }
                                        >
                                                When you click on the <Code>Go back</Code> button, we will
                                                try to recover the session if it exists. If you don&apos;t
                                                have an active session, you will be redirected to the login
                                                page
                                        </Trans>
                                    ),
                                    headingI18nKey: "myAccount:common.modals.sessionTimeoutModal.heading",
                                    loginAgainButtonText: (
                                        <Trans
                                            i18nKey={
                                                "myAccount:common.modals.sessionTimeoutModal.loginAgainButton"
                                            }
                                        >
                                                Login again
                                        </Trans>
                                    ),
                                    primaryButtonText: (
                                        <Trans
                                            i18nKey={
                                                "myAccount:common.modals.sessionTimeoutModal.primaryButton"
                                            }
                                        >
                                                Go back
                                        </Trans>
                                    ),
                                    secondaryButtonText: (
                                        <Trans
                                            i18nKey={
                                                "myAccount:common.modals.sessionTimeoutModal.secondaryButton"
                                            }
                                        >
                                                Logout
                                        </Trans>
                                    ),
                                    sessionTimedOutDescription: (
                                        <Trans
                                            i18nKey={
                                                "myAccount:common.modals.sessionTimeoutModal" +
                                                    ".sessionTimedOutDescription"
                                            }
                                        >
                                                Please log in again to continue from where you left off.
                                        </Trans>
                                    ),
                                    sessionTimedOutHeadingI18nKey: "myAccount:common.modals" +
                                            ".sessionTimeoutModal.sessionTimedOutHeading"
                                } }
                                type={ SessionTimeoutModalTypes.DEFAULT }
                            >
                                <>
                                    <NetworkErrorModal
                                        heading={ (
                                            <Trans
                                                i18nKey={ "common:networkErrorMessage.heading" }
                                            >
                                                    Your session has expired
                                            </Trans>
                                        ) }
                                        description={ (
                                            <Trans
                                                i18nKey={ "common:networkErrorMessage.description" }
                                            >
                                                    Please try signing in again.
                                            </Trans>
                                        ) }
                                        primaryActionText={ (
                                            <Trans
                                                i18nKey={
                                                    "common:networkErrorMessage.primaryActionText"
                                                }
                                            >
                                                    Sign In
                                            </Trans>
                                        ) }
                                        primaryAction={
                                            signOut
                                        }
                                    />
                                    <ChunkErrorModal
                                        heading={ (
                                            <Trans
                                                i18nKey={
                                                    "common:chunkLoadErrorMessage.heading"
                                                }
                                            >
                                                    Something went wrong
                                            </Trans>
                                        ) }
                                        description={ (
                                            <Trans
                                                i18nKey={
                                                    "common:chunkLoadErrorMessage.description"
                                                }
                                            >
                                                    An error occurred when serving the requested
                                                    application. Please try reloading the app.
                                            </Trans>
                                        ) }
                                        primaryActionText={ (
                                            <Trans
                                                i18nKey={
                                                    "common:chunkLoadErrorMessage.primaryActionText"
                                                }
                                            >
                                                    Reload the App
                                            </Trans>
                                        ) }
                                    />
                                    <Switch>
                                        <Redirect exact from="/" to={ AppConstants.getAppHomePath() } />
                                        {
                                            config
                                                ? filterRoutes(baseRoutes, config)
                                                    .map((route: RouteInterface, index: number) => {
                                                        return (
                                                            route.redirectTo
                                                                ? (
                                                                    <Redirect
                                                                        to={ route.redirectTo }
                                                                        path={ route.path }
                                                                    />
                                                                )
                                                                : route.protected
                                                                    ? (
                                                                        <ProtectedRoute
                                                                            component={ route.component }
                                                                            path={ route.path }
                                                                            key={ index }
                                                                            route={ route }
                                                                            exact={ route.exact }
                                                                        />
                                                                    )
                                                                    :
                                                                    (
                                                                        <Route
                                                                            path={ route.path }
                                                                            render={ (props: RouteProps) => (
                                                                                <route.component
                                                                                    { ...props }
                                                                                />
                                                                            ) }
                                                                            key={ index }
                                                                            exact={ route.exact }
                                                                        />
                                                                    )
                                                        );
                                                    })
                                                : null
                                        }
                                    </Switch>
                                </>
                            </SessionManagementProvider>
                        </MediaContextProvider>
                    </Suspense>
                </div>
            </DecoratedApp>
        </Router>
    );
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default App;
