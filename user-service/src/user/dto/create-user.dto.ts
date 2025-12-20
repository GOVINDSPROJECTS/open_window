import { IsEmail, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsUrl()
    profilePicture?: string;
}
