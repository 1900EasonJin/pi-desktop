import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type SelectFieldOption = {
	value: string;
	label: ReactNode;
	disabled?: boolean;
};

export function SelectField(props: {
	label: ReactNode;
	value: string;
	options: SelectFieldOption[];
	onChange: (value: string) => void;
	className?: string;
	description?: ReactNode;
	disabled?: boolean;
}) {
	return (
		<label
			className={["ui-field ui-select-field", props.className]
				.filter(Boolean)
				.join(" ")}
		>
			<span className="ui-field-label">{props.label}</span>
			<span className="ui-select-control">
				<select
					value={props.value}
					disabled={props.disabled}
					onChange={(event) => props.onChange(event.target.value)}
				>
					{props.options.map((option) => (
						<option
							key={option.value}
							value={option.value}
							disabled={option.disabled}
						>
							{option.label}
						</option>
					))}
				</select>
				<ChevronDown size={15} strokeWidth={2.2} aria-hidden="true" />
			</span>
			{props.description && (
				<small className="ui-field-description">{props.description}</small>
			)}
		</label>
	);
}
