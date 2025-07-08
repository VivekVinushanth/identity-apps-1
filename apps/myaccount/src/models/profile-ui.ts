/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

import { IdentifiableComponentInterface, PatchOperationRequest, ProfileSchemaInterface } from "@wso2is/core/models";
import { FormValue, Validation } from "@wso2is/forms";
import { ProfilePatchOperationValue } from "./profile";

/**
 * Props interface of the profile field form renderer.
 */
export interface ProfileFieldFormRendererPropsInterface extends IdentifiableComponentInterface {
    /**
     * The schema of the attribute.
     */
    fieldSchema: ProfileSchemaInterface;
    /**
     * The flattened profile schema. This is used in the email, mobile number fields.
     */
    flattenedProfileSchema: ProfileSchemaInterface[];
    /**
     * The initial value of the attribute.
     */
    initialValue: string;
    /**
     * The label to be displayed.
     */
    fieldLabel: string;
    /**
     * Whether the field is in edit mode or not.
     */
    isActive: boolean;
    /**
     * Whether the field is editable or not.
     */
    isEditable: boolean;
    /**
     * Whether the attribute value is required or not.
     */
    isRequired: boolean;
    /**
     * Callback to set the profile updating state.
     *
     * @param value - Profile updating state.
     */
    setIsProfileUpdating: (value: boolean) => void;
    /**
     * Callback to trigger the profile update.
     *
     * @param data - Patch operation data.
     */
    triggerUpdate: (data: PatchOperationRequest<ProfilePatchOperationValue>) => void;
    /**
     * Mapped user profile data. This is used in the email, mobile number fields.
     * Ex: Retrieve the primary email address.
     */
    profileInfo: Map<string, string>;
    /**
     * Whether email verification is enabled or not.
     */
    isEmailVerificationEnabled: boolean;
    /**
     * Whether mobile number verification is enabled or not.
     */
    isMobileVerificationEnabled: boolean;
    /**
     * Whether the profile is loading or not.
     */
    isLoading: boolean;
    /**
     * Whether the profile is updating or not.
     */
    isUpdating: boolean;
}

export interface ProfileFieldFormPropsInterface
    extends Omit<
        ProfileFieldFormRendererPropsInterface,
        | "triggerUpdate"
        | "profileInfo"
        | "isEmailVerificationEnabled"
        | "isMobileVerificationEnabled"
        | "flattenedProfileSchema"
    > {
    /**
     * Callback to trigger the edit mode.
     */
    onEditClicked: () => void;
    /**
     * Callback to close the edit mode.
     */
    onEditCancelClicked: () => void;
    /**
     * Callback to submit the data.
     *
     * @param schemaName - Schema name.
     * @param value - Value to be submitted.
     */
    handleSubmit: (schemaName: string, value: FormValue) => void;
}

export interface TextFieldFormPropsInterface extends ProfileFieldFormPropsInterface {
    /**
     * Callback to validate the field. If not provided, the default validation will be used.
     * In the default validation, the value will be validated against the schema regex.
     *
     * @param value - Value to be validated.
     * @param validation - Validation object.
     */
    onValidate?: (value: string, validation: Validation) => void;
    /**
     * Placeholder text to be displayed. If not provided, the default placeholder text will be used.
     */
    placeholderText?: string;
    /**
     * Type of the input field. If not provided, "text" will be used.
     */
    type?: "text" | "number";
    /**
     * Step value of the input field. Only used in the number field.
     */
    step?: number | "any";
}

export interface CountryFieldFormPropsInterface extends ProfileFieldFormPropsInterface {}

export interface EmailFieldFormPropsInterface extends Omit<ProfileFieldFormPropsInterface, "handleSubmit"> {
    /**
     * Mapped user profile data.
     */
    profileInfo: Map<string, string>;
    /**
     * Whether the verification is enabled or not.
     */
    isVerificationEnabled: boolean;
    /**
     * Callback to trigger the update.
     *
     * @param data - Patch operation data.
     */
    triggerUpdate: (data: PatchOperationRequest<ProfilePatchOperationValue>) => void;
}

export interface MobileFieldFormPropsInterface extends Omit<ProfileFieldFormPropsInterface, "handleSubmit"> {
    /**
     * Mapped user profile data.
     */
    profileInfo: Map<string, string>;
    /**
     * Whether the verification is enabled or not.
     */
    isVerificationEnabled: boolean;
    /**
     * Callback to trigger the update.
     *
     * @param data - Patch operation data.
     */
    triggerUpdate: (data: PatchOperationRequest<ProfilePatchOperationValue>) => void;
    /**
     * Flattened profile schema.
     */
    flattenedProfileSchema: ProfileSchemaInterface[];
}

export interface CheckBoxFieldFormPropsInterface
    extends Omit<
        ProfileFieldFormPropsInterface,
        "isActive" | "isEditable" | "isRequired" | "profileInfo" | "onEditClicked" | "onEditCancelClicked"
    > {}

export interface DOBFieldFormPropsInterface extends ProfileFieldFormPropsInterface {}

export interface DropdownFieldFormPropsInterface extends ProfileFieldFormPropsInterface {}

export interface MultiValueFieldFormPropsInterface<T extends string | number>
    extends Omit<ProfileFieldFormPropsInterface, "initialValue"> {
    /**
     * Initial value of the field.
     */
    initialValue: T[];
    /**
     * Type of the field. If not provided, "text" will be used.
     */
    type?: string;
}
