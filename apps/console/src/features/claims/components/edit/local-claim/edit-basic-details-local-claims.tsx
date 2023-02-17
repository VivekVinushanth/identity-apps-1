/**
 * Copyright (c) 2020, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
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

import { AccessControlConstants, Show } from "@wso2is/access-control";
import { IdentityAppsApiException } from "@wso2is/core/exceptions";
import { hasRequiredScopes } from "@wso2is/core/helpers";
import {
    AlertInterface,
    AlertLevels,
    AssociatedExternalClaim,
    Claim,
    ProfileSchemaInterface,
    TestableComponentInterface
} from "@wso2is/core/models";
import { addAlert, setProfileSchemaRequestLoadingStatus, setSCIMSchemas } from "@wso2is/core/store";
import { Field, Form } from "@wso2is/form";
import {
    ConfirmationModal,
    CopyInputField,
    DangerZone,
    DangerZoneGroup,
    EmphasizedSegment,
    Hint,
    Link,
    Message
} from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { Divider, Grid, Form as SemanticForm } from "semantic-ui-react";
import { attributeConfig } from "../../../../../extensions";
import { SCIMConfigs } from "../../../../../extensions/configs/scim";
import { AppConstants, AppState, FeatureConfigInterface, history } from "../../../../core";
import { getProfileSchemas } from "../../../../users/api";
import { deleteAClaim, updateAClaim } from "../../../api";
import { ClaimManagementConstants } from "../../../constants";

/**
 * Prop types for `EditBasicDetailsLocalClaims` component
 */
interface EditBasicDetailsLocalClaimsPropsInterface extends TestableComponentInterface {
    /**
     * The claim to be edited
     */
    claim: Claim;
    /**
     * The function to be called to initiate an update
     */
    update: () => void;
}

const FORM_ID: string = "local-claim-basic-details-form";

/**
 * This component renders the Basic Details pane of the edit local claim screen
 *
 * @param props - Props injected to the component.
 * @returns Functional component.
 */
export const EditBasicDetailsLocalClaims: FunctionComponent<EditBasicDetailsLocalClaimsPropsInterface> = (
    props: EditBasicDetailsLocalClaimsPropsInterface
): ReactElement => {

    const {
        claim,
        update,
        [ "data-testid" ]: testId
    } = props;

    const dispatch: Dispatch<any> = useDispatch();
    const [ shouldShowOnProfile, isSupportedByDefault ] = useState<boolean>(false);
    const [ isShowDisplayOrder, setIsShowDisplayOrder ] = useState(false);
    const [ confirmDelete, setConfirmDelete ] = useState(false);
    const [ isClaimReadOnly, setIsClaimReadOnly ] = useState<boolean>(false);
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const [ hasMapping, setHasMapping ] = useState<boolean>(false);
    const [ mappingChecked, setMappingChecked ] = useState<boolean>(false);

    const nameField: React.MutableRefObject<HTMLElement> = useRef<HTMLElement>(null);
    const regExField:  React.MutableRefObject<HTMLElement>= useRef<HTMLElement>(null);
    const displayOrderField: React.MutableRefObject<HTMLElement> = useRef<HTMLElement>(null);
    const descriptionField: React.MutableRefObject<HTMLElement> = useRef<HTMLElement>(null);

    const allowedScopes: string = useSelector((state: AppState) => state?.auth?.allowedScopes);
    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);
    const [ hideSpecialClaims, setHideSpecialClaims ] = useState<boolean>(true);

    const { t } = useTranslation();

    useEffect(() => {
        if (claim?.supportedByDefault) {
            setIsShowDisplayOrder(true);
        }
        if (claim?.readOnly) {
            setIsClaimReadOnly(true);
        }
        if (claim && (attributeConfig?.systemClaims.length <= 0
            || attributeConfig?.systemClaims.indexOf(claim?.claimURI) === -1)) {
            setHideSpecialClaims(false);
        }
    }, [ claim ]);

    useEffect(() => {
        const dialectURI: string[] = getDialectURI();

        if(claim) {
            const associatedExternalClaims: AssociatedExternalClaim[] = claim.associatedExternalClaims;

            associatedExternalClaims.forEach((externalClaim:AssociatedExternalClaim) => {

                if (dialectURI.indexOf(externalClaim.claimDialectURI) > -1) {
                    setHasMapping(true);

                    return;
                }
            });
            setMappingChecked(true);
        }
    }, [ claim ]);

    const getDialectURI = (): string[]  => {
        const dialectURI: string[] = [];

        ClaimManagementConstants.SCIM_TABS.filter((claim:{name: string, uri: string}) => {
            if(claim.name == "Core Schema") dialectURI.push(claim.uri);
            if(claim.name == "User Schema") dialectURI.push(claim.uri);
            if(claim.name == "Enterprise Schema") dialectURI.push(claim.uri);
        });
        dialectURI.push(SCIMConfigs.scimDialectID.customEnterpriseSchemaURI);

        return dialectURI;
    };

    // Temporary fix to check system claims and make them readonly
    const isReadOnly: boolean = useMemo(() => {
        if (hideSpecialClaims) {
            return true;
        } else {
            return !hasRequiredScopes(
                featureConfig?.attributeDialects, featureConfig?.attributeDialects?.scopes?.update, allowedScopes);
        }
    }, [ featureConfig, allowedScopes, hideSpecialClaims ]);

    const deleteConfirmation = (): ReactElement => (
        <ConfirmationModal
            onClose={ (): void => setConfirmDelete(false) }
            type="negative"
            open={ confirmDelete }
            assertionHint={ t("console:manage.features.claims.local.confirmation.hint") }
            assertionType="checkbox"
            primaryAction={ t("console:manage.features.claims.local.confirmation.primaryAction") }
            secondaryAction={ t("common:cancel") }
            onSecondaryActionClick={ (): void => setConfirmDelete(false) }
            onPrimaryActionClick={ (): void => deleteLocalClaim(claim.id) }
            data-testid={ `${ testId }-delete-confirmation-modal` }
            closeOnDimmerClick={ false }
        >
            <ConfirmationModal.Header>
                { t("console:manage.features.claims.local.confirmation.header") }
            </ConfirmationModal.Header>
            <ConfirmationModal.Message attached negative>
                { t("console:manage.features.claims.local.confirmation.message") }
            </ConfirmationModal.Message>
            <ConfirmationModal.Content>
                { t("console:manage.features.claims.local.confirmation.content") }
            </ConfirmationModal.Content>
        </ConfirmationModal>
    );

    /**
     * This deletes a local claim
     *
     * @param id - Claim id.
     */
    const deleteLocalClaim = (id: string): void => {
        deleteAClaim(id).then(() => {
            history.push(AppConstants.getPaths().get("LOCAL_CLAIMS"));
            dispatch(addAlert(
                {
                    description: t("console:manage.features.claims.local.notifications.deleteClaim.success." +
                        "description"),
                    level: AlertLevels.SUCCESS,
                    message: t("console:manage.features.claims.local.notifications.deleteClaim.success.message")
                }
            ));
        }).catch((error: any) => {
            dispatch(addAlert(
                {
                    description: error?.description
                        || t("console:manage.features.claims.local.notifications.deleteClaim.genericError.description"),
                    level: AlertLevels.ERROR,
                    message: error?.message
                        || t("console:manage.features.claims.local.notifications.deleteClaim.genericError.message")
                }
            ));
        }).finally(() => {
            setConfirmDelete(false);
        });
    };

    /**
     * Fetch the updated SCIM2 schema list.
     */
    const fetchUpdatedSchemaList = (): void => {
        dispatch(setProfileSchemaRequestLoadingStatus(true));

        getProfileSchemas()
            .then((response: ProfileSchemaInterface[]) => {
                dispatch(setSCIMSchemas<ProfileSchemaInterface[]>(response));
            })
            .catch((error: IdentityAppsApiException) => {
                if (error?.response?.data?.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: t("console:manage.notifications.getProfileSchema.error.message")
                    })
                    );
                }

                dispatch(
                    addAlert<AlertInterface>({
                        description: t(
                            "console:manage.notifications.getProfileSchema.genericError.description"
                        ),
                        level: AlertLevels.ERROR,
                        message: t(
                            "console:manage.notifications.getProfileSchema.genericError.message"
                        )
                    })
                );
            })
            .finally(() => {
                dispatch(setProfileSchemaRequestLoadingStatus(false));
            });
    };

    const onSubmit = (values: any) => {
        const data: Claim = {
            attributeMapping: claim.attributeMapping,
            claimURI: claim.claimURI,
            description: values?.description !== undefined ? values.description?.toString() : claim?.description,
            displayName: values?.name !== undefined ? values.name?.toString() : claim?.displayName,
            displayOrder: attributeConfig.editAttributes.getDisplayOrder(
                claim.displayOrder, values.displayOrder?.toString()),
            properties: claim.properties,
            readOnly: values?.readOnly !== undefined ? !!values.readOnly : claim?.readOnly,
            regEx:  values?.regularExpression !== undefined ? values.regularExpression?.toString() : claim?.regEx,
            required: values?.required !== undefined && !values?.readOnly ? !!values.required : false,
            supportedByDefault: values?.supportedByDefault !== undefined
                ? !!values.supportedByDefault : claim?.supportedByDefault
        };

        setIsSubmitting(true);

        updateAClaim(claim.id, data).then(() => {
            dispatch(addAlert(
                {
                    description: t("console:manage.features.claims.local.notifications." +
                        "updateClaim.success.description"),
                    level: AlertLevels.SUCCESS,
                    message: t("console:manage.features.claims.local.notifications." +
                        "updateClaim.success.message")
                }
            ));
            update();
            fetchUpdatedSchemaList();
        }).catch((error:any) => {
            dispatch(addAlert(
                {
                    description: error?.description
                        || t("console:manage.features.claims.local.notifications.updateClaim." +
                            "genericError.description"),
                    level: AlertLevels.ERROR,
                    message: error?.message
                        || t("console:manage.features.claims.local.notifications." +
                            "updateClaim.genericError.description")
                }
            ));
        })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <>
            { confirmDelete && deleteConfirmation() }
            <EmphasizedSegment padded="very">
                <Grid>
                    <Grid.Row columns={ 1 }>
                        <Grid.Column tablet={ 16 } computer={ 12 } largeScreen={ 9 } widescreen={ 6 } mobile={ 16 }>
                            <SemanticForm>
                                <SemanticForm.Field
                                    data-testid={ `${ testId }-form-attribute-uri-readonly-input` }
                                >
                                    <label>{ t("console:manage.features.claims.local.attributes.attributeURI") }</label>
                                    <CopyInputField value={ claim ? claim.claimURI : "" } />
                                    <Hint>Unique identifier of the attribute.</Hint>
                                </SemanticForm.Field>
                            </SemanticForm>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
                <Form
                    id={ FORM_ID }
                    uncontrolledForm={ false }
                    onSubmit={ (values: Record<string, any>): void => {
                        onSubmit(values as any);
                    } }
                    data-testid={ testId }
                >
                    <Field.Input
                        ariaLabel="name"
                        inputType="name"
                        name="name"
                        label={ t("console:manage.features.claims.local.forms.name.label") }
                        required={ true }
                        message={ t("console:manage.features.claims.local.forms." +
                            "name.requiredErrorMessage") }
                        placeholder={ t("console:manage.features.claims.local.forms.name.placeholder") }
                        value={ claim?.displayName }
                        ref={ nameField }
                        validation={ (value: string) => {
                            if (!value.toString().match(/^[A-za-z0-9#+._\-\s]{1,30}$/)) {
                                return t("console:manage.features.claims.local" +
                                    ".forms.name.validationErrorMessages.invalidName");
                            }
                        } }
                        data-testid={ `${ testId }-form-name-input` }
                        maxLength={ 30 }
                        minLength={ 1 }
                        hint={ t("console:manage.features.claims.local.forms.nameHint") }
                        readOnly={ isReadOnly }

                    />
                    <Field.Textarea
                        ariaLabel="description"
                        inputType="description"
                        name="description"
                        label={ t("console:manage.features.claims.local.forms.description.label") }
                        required={ false }
                        requiredErrorMessage=""
                        placeholder={
                            t("console:manage.features.claims.local.forms.description.placeholder")
                        }
                        ref={ descriptionField }
                        value={ claim?.description }
                        maxLength={ 255 }
                        minLength={ 3 }
                        data-testid={ `${ testId }-form-description-input` }
                        hint={ t("console:manage.features.claims.local.forms.descriptionHint") }
                        readOnly={ isReadOnly }
                    />

                    { attributeConfig.localAttributes.createWizard.showRegularExpression && !hideSpecialClaims
                        && (
                            <Field.Input
                                ariaLabel="regularExpression"
                                inputType="default"
                                name="regularExpression"
                                label={ t("console:manage.features.claims.local.forms.regEx.label") }
                                required={ false }
                                requiredErrorMessage=""
                                placeholder={ t("console:manage.features.claims.local.forms.regEx.placeholder") }
                                value={ claim?.regEx }
                                ref={ regExField }
                                data-testid={ `${ testId }-form-regex-input` }
                                maxLength={ 50 }
                                minLength={ 3 }
                                hint={ t("console:manage.features.claims.local.forms.regExHint") }
                                readOnly={ isReadOnly }
                            />
                        )
                    }
                    { mappingChecked
                        ? (
                            !hideSpecialClaims &&
                            (<Grid.Row columns={ 1 } >
                                <Grid.Column mobile={ 16 } tablet={ 16 } computer={ 14 }>
                                    <Message
                                        type="info"
                                        content={
                                            !hasMapping ? (
                                                <>
                                                    { t("console:manage.features.claims.local.forms.infoMessages." +
                                                        "disabledConfigInfo") }
                                                    <div>
                                                        Add SCIM mapping from
                                                        <Link
                                                            external={ false }
                                                            onClick={ () =>
                                                                history.push(
                                                                    AppConstants.getPaths().get("SCIM_MAPPING")
                                                                )
                                                            }
                                                        > here
                                                        </Link>.
                                                    </div>
                                                </>
                                            ):(
                                                t("console:manage.features.claims.local.forms.infoMessages." +
                                                    "configApplicabilityInfo")
                                            )
                                        }
                                    />
                                </Grid.Column>
                            </Grid.Row>)
                        )
                        : null
                    }
                    {
                        //Hides on user_id, username and groups claims
                        claim && claim.claimURI !== ClaimManagementConstants.USER_ID_CLAIM_URI
                            && claim.claimURI !== ClaimManagementConstants.USER_NAME_CLAIM_URI
                            && claim.claimURI !== ClaimManagementConstants.GROUPS_CLAIM_URI
                            && !hideSpecialClaims && mappingChecked &&
                        (
                            <Field.Checkbox
                                ariaLabel="supportedByDefault"
                                name="supportedByDefault"
                                label={ t("console:manage.features.claims.local.forms.supportedByDefault.label") }
                                required={ false }
                                defaultValue={ claim?.supportedByDefault }
                                listen={ (values: any) => {
                                    setIsShowDisplayOrder(!!values?.supportedByDefault);
                                } }
                                data-testid={ `${testId}-form-supported-by-default-input` }
                                readOnly={ isReadOnly }
                                disabled={ !hasMapping }
                                {
                                    ...( shouldShowOnProfile
                                        ? { checked: true }
                                        : { defaultValue : claim?.supportedByDefault }
                                    )
                                }
                            />
                        )
                    }
                    {
                        attributeConfig.editAttributes.showDisplayOrderInput && isShowDisplayOrder
                        && !hideSpecialClaims
                        && (
                            <Field.Input
                                ariaLabel="displayOrder"
                                inputType="default"
                                name="displayOrder"
                                type="number"
                                min="0"
                                label={ t("console:manage.features.claims.local.forms.displayOrder" +
                                    ".label") }
                                required={ false }
                                placeholder={ t("console:manage.features.claims.local.forms." +
                                    "displayOrder.placeholder") }
                                value={ claim?.displayOrder.toString() || 0 }
                                maxLength={ 50 }
                                minLength={ 1 }
                                ref={ displayOrderField }
                                data-testid={ `${ testId }-form-display-order-input` }
                                hint={ t("console:manage.features.claims.local.forms.displayOrderHint") }
                                readOnly={ isReadOnly }
                            />
                        )
                    }
                    {
                        claim && attributeConfig.editAttributes.showRequiredCheckBox
                            && claim.claimURI !== ClaimManagementConstants.GROUPS_CLAIM_URI
                            && !hideSpecialClaims && mappingChecked && (
                            <Field.Checkbox
                                ariaLabel="required"
                                name="required"
                                required={ false }
                                requiredErrorMessage=""
                                label={ t("console:manage.features.claims.local.forms.required.label") }
                                data-testid={ `${ testId }-form-required-checkbox` }
                                readOnly={ isReadOnly }
                                hint={ t("console:manage.features.claims.local.forms.requiredHint") }
                                listen ={ (value: any) => {
                                    isSupportedByDefault(value);
                                } }
                                disabled={ isClaimReadOnly || !hasMapping }
                                {
                                    ...( isClaimReadOnly
                                        ? { value: false }
                                        : { defaultValue : claim?.required }
                                    )
                                }
                            />
                        )
                    }
                    {
                        //Hides on user_id, username and groups claims
                        claim && claim.claimURI !== ClaimManagementConstants.USER_ID_CLAIM_URI
                            && claim.claimURI !== ClaimManagementConstants.USER_NAME_CLAIM_URI
                            && claim.claimURI !== ClaimManagementConstants.GROUPS_CLAIM_URI
                            && !hideSpecialClaims && mappingChecked &&
                        (
                            <Field.Checkbox
                                ariaLabel="readOnly"
                                name="readOnly"
                                required={ false }
                                label={ t("console:manage.features.claims.local.forms.readOnly.label") }
                                requiredErrorMessage=""
                                defaultValue={ claim?.readOnly }
                                data-testid={ `${ testId }-form-readonly-checkbox` }
                                readOnly={ isReadOnly }
                                hint={ t("console:manage.features.claims.local.forms.readOnlyHint") }
                                listen={ (value: any) => {
                                    setIsClaimReadOnly(value);
                                } }
                                disabled={ !hasMapping }
                            />
                        )
                    }
                    {
                        hasRequiredScopes(
                            featureConfig?.attributeDialects,
                            featureConfig?.attributeDialects?.scopes?.update,
                            allowedScopes
                        ) && !hideSpecialClaims &&
                        (
                            <Field.Button
                                form={ FORM_ID }
                                ariaLabel="submit"
                                size="small"
                                buttonType="primary_btn"
                                loading={ isSubmitting }
                                disabled={ isSubmitting }
                                label={ t("common:update") }
                                name="submit"
                            />
                        )
                    }
                </Form>
            </EmphasizedSegment>
            <Divider hidden />
            {
                attributeConfig.editAttributes.showDangerZone && !hideSpecialClaims
                && (
                    <Show when={ AccessControlConstants.ATTRIBUTE_DELETE }>
                        <DangerZoneGroup
                            sectionHeader={ t("common:dangerZone") }
                            data-testid={ `${ testId }-danger-zone-group` }
                        >
                            <DangerZone
                                actionTitle={ t("console:manage.features.claims.local.dangerZone.actionTitle") }
                                header={ t("console:manage.features.claims.local.dangerZone.header") }
                                subheader={ t("console:manage.features.claims.local.dangerZone.subheader") }
                                onActionClick={ () => setConfirmDelete(true) }
                                data-testid={ `${ testId }-local-claim-delete-danger-zone` }
                            />
                        </DangerZoneGroup>
                    </Show>
                )
            }
        </>
    );
};

/**
 * Default props for the component.
 */
EditBasicDetailsLocalClaims.defaultProps = {
    "data-testid": "local-claims-basic-details-edit"
};
